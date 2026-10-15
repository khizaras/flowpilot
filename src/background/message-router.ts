import type { ExecutionRun, ExecutionStep, Workflow, WorkflowStep, StepResult } from '../shared/types';
import { WorkflowManager } from '../domain/workflow';
import { WorkflowRepository } from '../storage/workflow-repository';
import { ExecutionRepository } from '../storage/execution-repository';

type ExtensionMessage = { type?: string; [key: string]: unknown };
type MessageHandler = (message: ExtensionMessage, sender: chrome.runtime.MessageSender) => unknown | Promise<unknown>;

// How long a workflow is allowed to run before the panel gives up waiting
const EXECUTION_TIMEOUT_MS = 120000;
// How long one step may keep looking for its target, across all frames
const STEP_RESOLVE_TIMEOUT_MS = 6000;
// Short pause between steps so pages can react
const STEP_PAUSE_MS = 150;

// Shared with content scripts; the service worker owns this session
const RECORDING_KEY = 'flowpilot_recording';

interface RecordingState {
  active: boolean;
  steps: WorkflowStep[];
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function pause(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function readRecordingState(): Promise<RecordingState> {
  const result = await chrome.storage.local.get([RECORDING_KEY]);
  const value = result[RECORDING_KEY] as Partial<RecordingState> | undefined;
  return {
    active: value?.active === true,
    steps: Array.isArray(value?.steps) ? value.steps : []
  };
}

function writeRecordingState(state: RecordingState): Promise<void> {
  return chrome.storage.local.set({ [RECORDING_KEY]: state });
}

/**
 * Turn executor diagnostics into persisted ExecutionStep records
 */
function convertStepResults(run: ExecutionRun, results: StepResult[]): ExecutionStep[] {
  return results.map((result, index) => ({
    id: `${run.id}_step${index}`,
    workflowId: run.workflowId,
    stepId: result.stepId,
    stepType: result.stepType,
    status: result.status,
    timestamp: result.timestamp,
    error: result.error
  }));
}

/**
 * Message Router for FlowPilot Extension
 * Handles routing and processing of messages between extension components
 */
export class MessageRouter {
  private handlers: Map<string, MessageHandler> = new Map();
  private isExecutingRun = false;

  constructor(
    private readonly workflows: WorkflowRepository,
    private readonly executions: ExecutionRepository
  ) {
    this.initializeHandlers();
  }

  private initializeHandlers(): void {
    this.addHandler('GET_RECORDING_STATE', () => this.handleGetRecordingState());
    this.addHandler('RECORD_STEP', (m) => this.handleRecordStep(m));
    this.addHandler('START_RECORDING', (m, s) => this.handleStartRecording(m, s));
    this.addHandler('STOP_RECORDING', (m, s) => this.handleStopRecording(m, s));
    this.addHandler('EXECUTE_WORKFLOW', (m, s) => this.handleExecuteWorkflow(m, s));
    this.addHandler('SAVE_WORKFLOW', (m) => this.handleSaveWorkflow(m));
    this.addHandler('LOAD_WORKFLOW', (m) => this.handleLoadWorkflow(m));
    this.addHandler('LIST_WORKFLOWS', () => this.handleListWorkflows());
    this.addHandler('DELETE_WORKFLOW', (m) => this.handleDeleteWorkflow(m));
    this.addHandler('LIST_RUNS', (m) => this.handleListRuns(m));
    this.addHandler('GET_RUN', (m) => this.handleGetRun(m));
    this.addHandler('GET_ACTIVE_TAB', () => this.handleGetActiveTab());
  }

  addHandler(type: string, handler: MessageHandler): void {
    this.handlers.set(type, handler);
  }

  handleMessage(message: unknown, sender: chrome.runtime.MessageSender, sendResponse: (response: unknown) => void): void {
    const msg = (message ?? {}) as ExtensionMessage;
    const handler = msg.type ? this.handlers.get(msg.type) : undefined;

    if (!handler) {
      sendResponse({ success: false, error: 'Unknown message type' });
      return;
    }

    void Promise.resolve()
      .then(() => handler(msg, sender))
      .then((response) => sendResponse(response))
      .catch((error: unknown) => sendResponse({ success: false, error: describeError(error) }));
  }

  private async resolveTargetTab(sender: chrome.runtime.MessageSender): Promise<number | undefined> {
    if (typeof sender.tab?.id === 'number') {
      return sender.tab.id;
    }
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab?.id;
  }

  // ---------- Recording session (service worker owns the state) ----------

  private async handleGetRecordingState(): Promise<unknown> {
    const state = await readRecordingState();
    return { success: true, isRecording: state.active, stepCount: state.steps.length };
  }

  private async handleRecordStep(message: ExtensionMessage): Promise<unknown> {
    const step = message.step as WorkflowStep | undefined;
    if (!step || typeof step !== 'object' || !step.id || !step.type) {
      return { success: false, error: 'Invalid step payload' };
    }

    const state = await readRecordingState();
    if (!state.active) {
      return { success: false, error: 'Not recording' };
    }
    state.steps.push(step);
    await writeRecordingState(state);
    return { success: true };
  }

  private async handleStartRecording(message: ExtensionMessage, sender: chrome.runtime.MessageSender): Promise<unknown> {
    const tabId = await this.resolveTargetTab(sender);
    if (tabId === undefined) {
      return { success: false, error: 'No active tab found' };
    }

    // Optional start page: navigate the active tab to the requested URL first
    const raw = typeof message.url === 'string' ? message.url.trim() : '';
    let startUrl: string | undefined;
    if (raw) {
      try {
        const parsed = new URL(raw);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
          throw new Error('bad protocol');
        }
        startUrl = parsed.toString();
      } catch {
        return { success: false, error: 'Enter a valid http(s) page URL' };
      }
    }

    // The recording session starts before navigation: the freshly loaded
    // page's content script adopts the active session through storage
    await writeRecordingState({ active: true, steps: [] });
    if (startUrl) {
      try {
        await chrome.tabs.update(tabId, { url: startUrl });
      } catch {
        // Tab may have been closed; the session stays armed either way
      }
    }
    try {
      await chrome.tabs.sendMessage(tabId, { type: 'START_RECORDING' });
    } catch {
      // Content script not present yet; it will adopt the session on load
    }

    return { success: true, message: 'Recording started' };
  }

  private async handleStopRecording(_message: ExtensionMessage, sender: chrome.runtime.MessageSender): Promise<unknown> {
    const tabId = await this.resolveTargetTab(sender);
    if (tabId === undefined) {
      return { success: false, error: 'No active tab found' };
    }

    // Tell every frame to stop so debounced inputs get flushed
    try {
      await chrome.tabs.sendMessage(tabId, { type: 'STOP_RECORDING' });
    } catch {
      // Not recording in any reachable frame
    }
    await pause(250);

    const state = await readRecordingState();
    await writeRecordingState({ active: false, steps: [] });

    if (!state.active) {
      return { success: false, error: 'Not recording' };
    }
    if (state.steps.length === 0) {
      return { success: false, error: 'No steps were captured during the recording' };
    }

    const workflow = WorkflowManager.createWorkflow(`Workflow ${new Date().toLocaleDateString()}`);
    workflow.steps = state.steps;
    await this.workflows.saveWorkflow(workflow);

    return { success: true, workflow };
  }

  // ---------- Execution (service worker orchestrates across frames) ----------

  private async handleGetActiveTab(): Promise<unknown> {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return { success: true, url: tab?.url ?? '' };
  }

  /**
   * Make sure at least one frame in the tab has the content script
   * (pages opened before the extension was installed or re-enabled)
   */
  private async ensureContentScripts(tabId: number): Promise<void> {
    try {
      // Any response (even "unknown message type") proves a script is present
      await chrome.tabs.sendMessage(tabId, { type: 'PING' });
      return;
    } catch {
      // Not present yet - inject into every frame
    }
    await chrome.scripting.executeScript({
      target: { tabId, allFrames: true },
      files: ['content/content.js']
    });
  }

  private async injectIntoFrame(tabId: number, frameId: number): Promise<void> {
    await chrome.scripting.executeScript({
      target: { tabId, frameIds: [frameId] },
      files: ['content/content.js']
    });
  }

  private async listFrameIds(tabId: number): Promise<number[]> {
    try {
      const frames = (await chrome.webNavigation.getAllFrames({ tabId })) ?? [];
      return frames
        .filter(frame => frame.frameId >= 0)
        .map(frame => frame.frameId)
        .sort((a, b) => a - b); // top frame (0) first
    } catch {
      return [0];
    }
  }

  private async sendStepToFrame(
    tabId: number,
    frameId: number,
    step: WorkflowStep,
    timeoutMs: number
  ): Promise<{ success?: boolean; error?: string } | undefined> {
    const attempt = async (): Promise<{ success?: boolean; error?: string }> =>
      await chrome.tabs.sendMessage(tabId, { type: 'EXECUTE_STEP', step, timeoutMs }, { frameId });
    try {
      return await attempt();
    } catch {
      // Frame has no content script - inject into just this frame and retry
      try {
        await this.injectIntoFrame(tabId, frameId);
        return await attempt();
      } catch {
        return undefined; // frame is not reachable (about:blank, etc.)
      }
    }
  }

  /**
   * Run one step, asking each frame in turn. All frames get a first-immediate
   * attempt, then every frame keeps polling until the deadline so
   * late-rendered content is still found
   */
  private async executeStepAcrossFrames(tabId: number, step: WorkflowStep): Promise<void> {
    if (step.type === 'wait') {
      await pause(step.wait?.timeout ?? 1000);
      return;
    }

    const frames = await this.listFrameIds(tabId);
    if (frames.length === 0) {
      throw new Error('no reachable frame');
    }

    // Pass 1: one immediate attempt per frame (top frame first)
    for (const frameId of frames) {
      const response = await this.sendStepToFrame(tabId, frameId, step, 0);
      if (response?.success) {
        return;
      }
      if (response && typeof response.error === 'string' && response.error.startsWith('unsupported')) {
        throw new Error(response.error);
      }
    }

    // Pass 2: keep trying across frames until the deadline
    const deadline = Date.now() + STEP_RESOLVE_TIMEOUT_MS;
    while (Date.now() < deadline) {
      for (const frameId of frames) {
        const response = await this.sendStepToFrame(tabId, frameId, step, 400);
        if (response?.success) {
          return;
        }
      }
    }
    throw new Error('target not found');
  }

  private broadcastProgress(tabId: number, current: number, total: number): void {
    void chrome.runtime.sendMessage({ type: 'RUN_PROGRESS', current, total }).catch(() => {
      // Panel may be closed mid-run
    });
    void chrome.tabs
      .sendMessage(tabId, { type: 'EXECUTION_BADGE', current, total }, { frameId: 0 })
      .catch(() => undefined);
  }

  private broadcastResult(tabId: number, success: boolean, error?: string): void {
    void chrome.tabs
      .sendMessage(tabId, { type: 'EXECUTION_BADGE', status: success ? 'success' : 'failed', error }, { frameId: 0 })
      .catch(() => undefined);
  }

  private async handleExecuteWorkflow(message: ExtensionMessage, sender: chrome.runtime.MessageSender): Promise<unknown> {
    const workflowId = typeof message.workflowId === 'string' ? message.workflowId : undefined;
    if (!workflowId) {
      return { success: false, error: 'No workflow id provided' };
    }
    if (this.isExecutingRun) {
      return { success: false, error: 'Another workflow is already running' };
    }

    const workflow = await this.workflows.getWorkflow(workflowId);
    if (!workflow) {
      return { success: false, error: 'Workflow not found' };
    }
    if (!Array.isArray(workflow.steps) || workflow.steps.length === 0) {
      return { success: false, error: 'This workflow has no recorded steps' };
    }

    const tabId = await this.resolveTargetTab(sender);
    if (tabId === undefined) {
      return { success: false, error: 'No active tab found' };
    }

    const startTime = Date.now();
    const run: ExecutionRun = {
      id: `run_${startTime}_${Math.random().toString(36).slice(2, 11)}`,
      workflowId,
      status: 'pending',
      startTime,
      steps: []
    };

    const steps: WorkflowStep[] = (workflow.steps as WorkflowStep[]).filter(step => step?.enabled !== false);
    if (steps.length === 0) {
      return { success: false, error: 'This workflow has no enabled steps' };
    }

    this.isExecutingRun = true;
    let failure: string | undefined;
    const results: StepResult[] = [];

    try {
      await this.ensureContentScripts(tabId);
      const runDeadline = startTime + EXECUTION_TIMEOUT_MS;

      for (let i = 0; i < steps.length; i++) {
        if (Date.now() >= runDeadline) {
          throw new Error('Workflow execution timed out');
        }
        const step = steps[i];
        const stepStart = Date.now();
        this.broadcastProgress(tabId, i + 1, steps.length);
        try {
          await this.executeStepAcrossFrames(tabId, step);
          results.push({ stepId: step.id, stepType: step.type, status: 'success', timestamp: stepStart });
        } catch (error) {
          const reason = describeError(error);
          results.push({ stepId: step.id, stepType: step.type, status: 'failed', timestamp: stepStart, error: reason });
          throw new Error(`Step ${i + 1} of ${steps.length} (${step.type}) failed: ${reason}`, { cause: error });
        }
        await pause(STEP_PAUSE_MS);
      }
      run.status = 'success';
      this.broadcastResult(tabId, true);
    } catch (error) {
      failure = describeError(error);
      run.status = 'failed';
      this.broadcastResult(tabId, false, failure);
    } finally {
      this.isExecutingRun = false;
    }

    run.steps = convertStepResults(run, results);
    run.endTime = Date.now();
    await this.executions.saveExecutionRun(run);

    if (run.status === 'failed') {
      return { success: false, error: failure ?? 'Workflow execution failed', runId: run.id };
    }
    return { success: true, runId: run.id };
  }

  // ---------- Workflow and run repositories ----------

  private async handleGetRun(message: ExtensionMessage): Promise<unknown> {
    const id = typeof message.id === 'string' ? message.id : undefined;
    if (!id) {
      return { success: false, error: 'No run id provided' };
    }
    const run = await this.executions.getExecutionRun(id);
    return { success: true, run };
  }

  private async handleSaveWorkflow(message: ExtensionMessage): Promise<unknown> {
    const workflow = message.workflow;
    if (!workflow || typeof workflow !== 'object') {
      return { success: false, error: 'No workflow provided' };
    }
    const id = await this.workflows.saveWorkflow(workflow as Workflow);
    return { success: true, id };
  }

  private async handleLoadWorkflow(message: ExtensionMessage): Promise<unknown> {
    const id = typeof message.id === 'string' ? message.id : undefined;
    if (!id) {
      return { success: false, error: 'No workflow id provided' };
    }
    const workflow = await this.workflows.getWorkflow(id);
    return { success: true, workflow };
  }

  private async handleListWorkflows(): Promise<unknown> {
    const items = await this.workflows.getAllWorkflows();
    return { success: true, workflows: items };
  }

  private async handleDeleteWorkflow(message: ExtensionMessage): Promise<unknown> {
    const id = typeof message.id === 'string' ? message.id : undefined;
    if (!id) {
      return { success: false, error: 'No workflow id provided' };
    }
    await this.workflows.deleteWorkflow(id);
    return { success: true };
  }

  private async handleListRuns(message: ExtensionMessage): Promise<unknown> {
    const workflowId = typeof message.workflowId === 'string' ? message.workflowId : undefined;
    const runs = workflowId
      ? await this.executions.getExecutionRunsForWorkflow(workflowId)
      : await this.executions.getAllExecutionRuns();
    return { success: true, runs };
  }
}
