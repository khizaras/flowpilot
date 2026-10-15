import type { ExecutionRun, ExecutionStep, Workflow, WorkflowSchedule, WorkflowStep, StepResult } from '../shared/types';
import { WorkflowManager } from '../domain/workflow';
import { WorkflowRepository } from '../storage/workflow-repository';
import { ExecutionRepository } from '../storage/execution-repository';
import { Scheduler } from './scheduler';

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

// Credential vault: secrets live ONLY here - never inside workflow JSON
const VAULT_KEY = 'flowpilot_vault';

// Run counters for scheduled workflows
const SCHED_META_KEY = 'flowpilot_sched_meta';

type CredentialVault = Record<string, Record<string, string>>;

const STEP_INTERACTION_TYPES = new Set([
  'click',
  'doubleClick',
  'rightClick',
  'hover',
  'type',
  'clear',
  'select',
  'wait',
  'navigate',
  'scroll',
  'screenshot'
]);

interface RecordingState {
  active: boolean;
  steps: WorkflowStep[];
  startUrl?: string;
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

async function readVault(): Promise<CredentialVault> {
  const result = await chrome.storage.local.get([VAULT_KEY]);
  const value = result[VAULT_KEY] as CredentialVault | undefined;
  return value ?? {};
}

function writeVault(vault: CredentialVault): Promise<void> {
  return chrome.storage.local.set({ [VAULT_KEY]: vault });
}

/**
 * Validate schedule settings coming from the panel
 */
function normalizeSchedule(raw: unknown): WorkflowSchedule | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const s = raw as Record<string, unknown>;
  const frequency = s.frequency;
  if (frequency !== 'once' && frequency !== 'daily' && frequency !== 'weekly' && frequency !== 'interval') {
    return null;
  }
  const schedule: WorkflowSchedule = { enabled: s.enabled !== false, frequency };

  if (frequency === 'daily' || frequency === 'weekly') {
    if (typeof s.time !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(s.time)) {
      return null;
    }
    schedule.time = s.time;
  }
  if (frequency === 'weekly') {
    if (!Array.isArray(s.weekdays)) {
      return null;
    }
    const weekdays = [...new Set(
      s.weekdays.filter((day): day is number => typeof day === 'number' && day >= 0 && day <= 6)
    )];
    if (weekdays.length === 0) {
      return null;
    }
    schedule.weekdays = weekdays;
  }
  if (frequency === 'interval') {
    const interval = Number(s.intervalMinutes);
    if (!Number.isFinite(interval) || interval < 1) {
      return null;
    }
    schedule.intervalMinutes = Math.round(interval);
  }
  if (frequency === 'once') {
    const at = Date.parse(typeof s.startAt === 'string' ? s.startAt : '');
    if (!Number.isFinite(at)) {
      return null;
    }
    schedule.startAt = new Date(at).toISOString();
  }

  const occurrences = Number(s.occurrences);
  if (Number.isFinite(occurrences) && occurrences > 0) {
    schedule.occurrences = Math.round(occurrences);
  }
  return schedule;
}

/**
 * Validate and normalize one imported step; returns a normalized step or throws with a
 * user-facing reason
 */
function normalizeImportedStep(step: unknown, position: number): WorkflowStep {
  if (!step || typeof step !== 'object') {
    throw new Error(`Step ${position + 1} in the file is malformed`);
  }
  const raw = step as Record<string, unknown>;
  if (typeof raw.type !== 'string' || !STEP_INTERACTION_TYPES.has(raw.type)) {
    throw new Error(`Step ${position + 1} has an unsupported type: ${String(raw.type)}`);
  }
  const hasId = typeof raw.id === 'string' && raw.id.length > 0;
  const normalized: WorkflowStep = {
    id: hasId ? (raw.id as string) : `step_${Date.now()}_${position}`,
    type: raw.type as WorkflowStep['type'],
    enabled: raw.enabled !== false,
    timestamp: typeof raw.timestamp === 'number' ? raw.timestamp : Date.now()
  };
  if (raw.target && typeof raw.target === 'object') {
    normalized.target = raw.target as WorkflowStep['target'];
  }
  if (raw.input && typeof raw.input === 'object') {
    normalized.input = raw.input as WorkflowStep['input'];
  }
  if (raw.wait && typeof raw.wait === 'object') {
    normalized.wait = raw.wait as WorkflowStep['wait'];
  }
  return normalized;
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
    this.addHandler('EXPORT_WORKFLOW', (m) => this.handleExportWorkflow(m));
    this.addHandler('IMPORT_WORKFLOW', (m) => this.handleImportWorkflow(m));
    this.addHandler('GET_CREDENTIALS', (m) => this.handleGetCredentials(m));
    this.addHandler('SET_CREDENTIAL', (m) => this.handleSetCredential(m));
    this.addHandler('DELETE_CREDENTIAL', (m) => this.handleDeleteCredential(m));
    this.addHandler('GET_SCHEDULE', (m) => this.handleGetSchedule(m));
    this.addHandler('SET_SCHEDULE', (m) => this.handleSetSchedule(m));
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
    await writeRecordingState({ active: true, steps: [], startUrl: startUrl ?? undefined });
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
    if (state.startUrl) {
      // Remembered so scheduled runs can reopen the same page
      workflow.startUrl = state.startUrl;
    }
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
    try {
      await this.ensureContentScripts(tabId);
      const outcome = await this.runStepsOnTab(tabId, workflow, run);
      run.status = outcome.status;
      failure = outcome.error;
      this.broadcastResult(tabId, outcome.status === 'success');
    } catch (error) {
      failure = describeError(error);
      run.status = 'failed';
      this.broadcastResult(tabId, false, failure);
    } finally {
      this.isExecutingRun = false;
    }

    run.endTime = Date.now();
    await this.executions.saveExecutionRun(run);

    if (run.status === 'failed') {
      return { success: false, error: failure ?? 'Workflow execution failed', runId: run.id };
    }
    return { success: true, runId: run.id };
  }

  /**
   * Execute the workflow's enabled steps on the given tab, collecting step
   * diagnostics into the run. Used by manual runs and scheduled runs alike
   */
  private async runStepsOnTab(
    tabId: number,
    workflow: Workflow,
    run: ExecutionRun,
    opts?: { silent?: boolean }
  ): Promise<{ status: 'success' | 'failed'; error?: string }> {
    const results: StepResult[] = [];
    const runDeadline = run.startTime + EXECUTION_TIMEOUT_MS;
    const vault = await readVault();
    const secrets = vault[workflow.id] ?? {};

    let failure: string | undefined;
    const steps: WorkflowStep[] = (workflow.steps as WorkflowStep[]).filter(step => step?.enabled !== false);

    for (let i = 0; i < steps.length; i++) {
      if (Date.now() >= runDeadline) {
        failure = 'Workflow execution timed out';
        break;
      }
      const step = steps[i];
      const stepStart = Date.now();
      if (!opts?.silent) {
        this.broadcastProgress(tabId, i + 1, steps.length);
      }
      try {
        let stepToSend = step;
        // Sensitive type steps replay with the credential from the local
        // vault; the value never exists inside the workflow or its export
        if (step.type === 'type' && step.input?.isSensitive) {
          const secret = secrets[step.id];
          if (typeof secret !== 'string' || secret.length === 0) {
            throw new Error('credential not configured for this step');
          }
          stepToSend = { ...step, input: { ...step.input, value: secret } };
        }
        await this.executeStepAcrossFrames(tabId, stepToSend);
        results.push({ stepId: step.id, stepType: step.type, status: 'success', timestamp: stepStart });
      } catch (error) {
        const reason = describeError(error);
        results.push({ stepId: step.id, stepType: step.type, status: 'failed', timestamp: stepStart, error: reason });
        failure = `Step ${i + 1} of ${steps.length} (${step.type}) failed: ${reason}`;
        break;
      }
      await pause(STEP_PAUSE_MS);
    }

    run.steps = convertStepResults(run, results);
    run.status = failure ? 'failed' : 'success';
    return { status: run.status, error: failure };
  }

  // ---------- Scheduled runs ----------

  private scheduler: Scheduler | null = null;

  private getScheduler(): Scheduler {
    this.scheduler ??= new Scheduler(this.workflows, (workflow) => this.runScheduledWorkflow(workflow));
    return this.scheduler;
  }

  /** Called by the service worker's alarm ticker */
  async tickScheduledWorkflows(): Promise<void> {
    await this.getScheduler().tick();
  }

  private async openRunTab(workflow: Workflow): Promise<number | undefined> {
    if (workflow.startUrl) {
      const tab = await chrome.tabs.create({ url: workflow.startUrl, active: false });
      return tab?.id;
    }
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab?.id;
  }

  private async waitForTabLoad(tabId: number, timeoutMs = 20000): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    for (;;) {
      const tab = await chrome.tabs.get(tabId).catch(() => undefined);
      if (!tab || tab.status === 'complete') {
        return;
      }
      if (Date.now() >= deadline) {
        return;
      }
      await pause(300);
    }
  }

  private async runScheduledWorkflow(workflow: Workflow): Promise<void> {
    if (this.isExecutingRun) {
      console.warn('Scheduled run skipped: another workflow is running');
      return;
    }

    const startTime = Date.now();
    const run: ExecutionRun = {
      id: `run_${startTime}_${Math.random().toString(36).slice(2, 11)}`,
      workflowId: workflow.id,
      status: 'pending',
      startTime,
      steps: []
    };

    this.isExecutingRun = true;
    let failure: string | undefined;
    try {
      const tabId = await this.openRunTab(workflow);
      if (tabId === undefined) {
        throw new Error('No tab available for the scheduled run');
      }
      await this.waitForTabLoad(tabId);
      await this.ensureContentScripts(tabId);
      const outcome = await this.runStepsOnTab(tabId, workflow, run, { silent: true });
      run.status = outcome.status;
      failure = outcome.error;
    } catch (error) {
      failure = describeError(error);
      run.status = 'failed';
    } finally {
      this.isExecutingRun = false;
    }

    run.endTime = Date.now();
    await this.executions.saveExecutionRun(run);
    if (run.status === 'failed') {
      console.warn(`Scheduled run of "${workflow.name}" failed: ${failure}`);
    } else {
      console.log(`Scheduled run of "${workflow.name}" completed`);
    }
  }

  // ---------- Schedule settings ----------

  private async handleGetSchedule(message: ExtensionMessage): Promise<unknown> {
    const workflowId = typeof message.id === 'string' ? message.id : undefined;
    if (!workflowId) {
      return { success: false, error: 'No workflow id provided' };
    }
    const workflow = await this.workflows.getWorkflow(workflowId);
    if (!workflow) {
      return { success: false, error: 'Workflow not found' };
    }
    const meta = await this.getScheduleMeta(workflowId);
    return { success: true, schedule: workflow.schedule ?? null, timesRun: meta?.timesRun ?? 0 };
  }

  private async handleSetSchedule(message: ExtensionMessage): Promise<unknown> {
    const workflowId = typeof message.id === 'string' ? message.id : undefined;
    if (!workflowId) {
      return { success: false, error: 'No workflow id provided' };
    }
    const workflow = await this.workflows.getWorkflow(workflowId);
    if (!workflow) {
      return { success: false, error: 'Workflow not found' };
    }

    const schedule = normalizeSchedule(message.schedule);
    if (!schedule) {
      return { success: false, error: 'The schedule settings are invalid' };
    }

    workflow.schedule = schedule;
    workflow.updatedAt = Date.now();
    await this.workflows.saveWorkflow(workflow);

    // A freshly armed schedule starts its occurrence counter at zero
    if (schedule.enabled) {
      await this.resetScheduleMeta(workflowId);
    }

    return { success: true, schedule };
  }

  private async getScheduleMeta(workflowId: string): Promise<{ timesRun?: number } | undefined> {
    const result = await chrome.storage.local.get([SCHED_META_KEY]);
    const meta = (result[SCHED_META_KEY] as Record<string, { timesRun?: number } | undefined> | undefined) ?? {};
    return meta[workflowId];
  }

  private async resetScheduleMeta(workflowId: string): Promise<void> {
    const result = await chrome.storage.local.get([SCHED_META_KEY]);
    const meta = (result[SCHED_META_KEY] as Record<string, { timesRun?: number } | undefined> | undefined) ?? {};
    meta[workflowId] = { timesRun: 0 };
    await chrome.storage.local.set({ [SCHED_META_KEY]: meta });
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
    // Purge the workflow's credentials from the local vault
    try {
      const vault = await readVault();
      if (id in vault) {
        delete vault[id];
        await writeVault(vault);
      }
    } catch {
      // Vault cleanup is best-effort
    }
    return { success: true };
  }

  private async handleListRuns(message: ExtensionMessage): Promise<unknown> {
    const workflowId = typeof message.workflowId === 'string' ? message.workflowId : undefined;
    const runs = workflowId
      ? await this.executions.getExecutionRunsForWorkflow(workflowId)
      : await this.executions.getAllExecutionRuns();
    return { success: true, runs };
  }

  // ---------- Export / import ----------

  private async handleExportWorkflow(message: ExtensionMessage): Promise<unknown> {
    const id = typeof message.id === 'string' ? message.id : undefined;
    if (!id) {
      return { success: false, error: 'No workflow id provided' };
    }
    const json = await this.workflows.exportWorkflow(id);
    const workflow = await this.workflows.getWorkflow(id);
    const filename = `${(workflow?.name ?? 'workflow').replace(/[^\w-]+/g, '-').toLowerCase()}.flowpilot.json`;
    return { success: true, json, filename };
  }

  private async handleImportWorkflow(message: ExtensionMessage): Promise<unknown> {
    const json = typeof message.json === 'string' ? message.json : undefined;
    if (!json?.trim()) {
      return { success: false, error: 'Select a workflow file first' };
    }

    let data: unknown;
    try {
      data = JSON.parse(json);
    } catch {
      return { success: false, error: 'That file is not valid JSON' };
    }

    const envelope = data as { format?: unknown; version?: unknown; workflow?: unknown };
    if (
      envelope?.format !== 'flowpilot' ||
      envelope?.version !== 1 ||
      !envelope.workflow ||
      typeof envelope.workflow !== 'object'
    ) {
      return { success: false, error: 'That file is not a FlowPilot workflow export' };
    }

    const imported = envelope.workflow as Partial<Workflow>;
    if (typeof imported.name !== 'string' || imported.name.trim().length === 0) {
      return { success: false, error: 'The export has no workflow name' };
    }

    let steps: WorkflowStep[];
    try {
      if (!Array.isArray(imported.steps)) {
        throw new Error('The export contains no steps');
      }
      steps = imported.steps.map((step, index) => normalizeImportedStep(step, index));
    } catch (error) {
      return { success: false, error: describeError(error) };
    }

    const description = typeof imported.description === 'string' ? imported.description : undefined;
    const workflow = WorkflowManager.createWorkflow(imported.name, description);
    workflow.steps = steps;
    await this.workflows.saveWorkflow(workflow);
    return { success: true, workflow };
  }

  // ---------- Credential vault ----------

  private async handleGetCredentials(message: ExtensionMessage): Promise<unknown> {
    const workflowId = typeof message.id === 'string' ? message.id : undefined;
    if (!workflowId) {
      return { success: false, error: 'No workflow id provided' };
    }
    const vault = await readVault();
    // Deliberately return only step ids with credentials, never their values
    const stepIds = Object.keys(vault[workflowId] ?? {});
    return { success: true, stepIds };
  }

  private async handleSetCredential(message: ExtensionMessage): Promise<unknown> {
    const workflowId = typeof message.id === 'string' ? message.id : undefined;
    const stepId = typeof message.stepId === 'string' ? message.stepId : undefined;
    const value = typeof message.value === 'string' ? message.value : undefined;
    if (!workflowId || !stepId) {
      return { success: false, error: 'Workflow and step are required' };
    }
    if (!value || value.length === 0) {
      return { success: false, error: 'The credential is empty' };
    }
    if (value.length > 1000) {
      return { success: false, error: 'The credential is too long' };
    }

    const workflow = await this.workflows.getWorkflow(workflowId);
    if (!workflow) {
      return { success: false, error: 'Workflow not found' };
    }

    const vault = await readVault();
    const entry = vault[workflowId] ?? {};
    entry[stepId] = value;
    vault[workflowId] = entry;
    await writeVault(vault);
    return { success: true };
  }

  private async handleDeleteCredential(message: ExtensionMessage): Promise<unknown> {
    const workflowId = typeof message.id === 'string' ? message.id : undefined;
    const stepId = typeof message.stepId === 'string' ? message.stepId : undefined;
    if (!workflowId || !stepId) {
      return { success: false, error: 'Workflow and step are required' };
    }
    const vault = await readVault();
    if (vault[workflowId]) {
      delete vault[workflowId][stepId];
      if (Object.keys(vault[workflowId]).length === 0) {
        delete vault[workflowId];
      }
      await writeVault(vault);
    }
    return { success: true };
  }
}
