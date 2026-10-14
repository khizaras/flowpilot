import type { ExecutionRun, Workflow, WorkflowStep } from '../shared/types';
import { WorkflowManager } from '../domain/workflow';
import { WorkflowRepository } from '../storage/workflow-repository';
import { ExecutionRepository } from '../storage/execution-repository';

type ExtensionMessage = { type?: string; [key: string]: unknown };
type MessageHandler = (message: ExtensionMessage, sender: chrome.runtime.MessageSender) => unknown | Promise<unknown>;

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Message Router for FlowPilot Extension
 * Handles routing and processing of messages between extension components
 */
export class MessageRouter {
  private handlers: Map<string, MessageHandler> = new Map();

  constructor(
    private readonly workflows: WorkflowRepository,
    private readonly executions: ExecutionRepository
  ) {
    this.initializeHandlers();
  }

  private initializeHandlers(): void {
    this.addHandler('GET_RECORDING_STATE', (m, s) => this.handleGetRecordingState(m, s));
    this.addHandler('START_RECORDING', (m, s) => this.handleStartRecording(m, s));
    this.addHandler('STOP_RECORDING', (m, s) => this.handleStopRecording(m, s));
    this.addHandler('EXECUTE_WORKFLOW', (m, s) => this.handleExecuteWorkflow(m, s));
    this.addHandler('SAVE_WORKFLOW', (m) => this.handleSaveWorkflow(m));
    this.addHandler('LOAD_WORKFLOW', (m) => this.handleLoadWorkflow(m));
    this.addHandler('LIST_WORKFLOWS', () => this.handleListWorkflows());
    this.addHandler('DELETE_WORKFLOW', (m) => this.handleDeleteWorkflow(m));
    this.addHandler('LIST_RUNS', (m) => this.handleListRuns(m));
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

  /**
   * Make sure the tab has the content script before messaging it
   * (e.g. pages opened before the extension was installed or re-enabled)
   */
  private async ensureContentScript(tabId: number): Promise<void> {
    try {
      // The content script always answers (even unknown messages), so any
      // response proves it is present
      await chrome.tabs.sendMessage(tabId, { type: 'PING' });
      return;
    } catch {
      // Not present yet - inject it
    }
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content/content.js']
    });
  }

  private async handleGetRecordingState(_message: ExtensionMessage, sender: chrome.runtime.MessageSender): Promise<unknown> {
    const tabId = await this.resolveTargetTab(sender);
    if (tabId === undefined) {
      return { success: true, isRecording: false, stepCount: 0 };
    }
    try {
      const state = await chrome.tabs.sendMessage(tabId, { type: 'GET_RECORDING_STATE' });
      return {
        success: true,
        isRecording: Boolean(state?.isRecording),
        stepCount: Number(state?.stepCount ?? 0)
      };
    } catch {
      // The content script is not present in this tab
      return { success: true, isRecording: false, stepCount: 0 };
    }
  }

  private async handleStartRecording(_message: ExtensionMessage, sender: chrome.runtime.MessageSender): Promise<unknown> {
    const tabId = await this.resolveTargetTab(sender);
    if (tabId === undefined) {
      return { success: false, error: 'No active tab found' };
    }
    try {
      await this.ensureContentScript(tabId);
      await chrome.tabs.sendMessage(tabId, { type: 'START_RECORDING' });
      return { success: true, message: 'Recording started' };
    } catch (error) {
      return { success: false, error: describeError(error) };
    }
  }

  private async handleStopRecording(_message: ExtensionMessage, sender: chrome.runtime.MessageSender): Promise<unknown> {
    const tabId = await this.resolveTargetTab(sender);
    if (tabId === undefined) {
      return { success: false, error: 'No active tab found' };
    }
    try {
      await this.ensureContentScript(tabId);
      const response = (await chrome.tabs.sendMessage(tabId, { type: 'STOP_RECORDING' })) as {
        success?: boolean;
        workflow?: WorkflowStep[];
      };
      if (!response?.success || !Array.isArray(response.workflow)) {
        return { success: false, error: 'Failed to stop recording' };
      }

      const workflow = WorkflowManager.createWorkflow(`Recording ${new Date().toLocaleString()}`);
      workflow.steps = response.workflow;
      await this.workflows.saveWorkflow(workflow);

      return { success: true, workflow };
    } catch (error) {
      return { success: false, error: describeError(error) };
    }
  }

  private async handleExecuteWorkflow(message: ExtensionMessage, sender: chrome.runtime.MessageSender): Promise<unknown> {
    const workflowId = typeof message.workflowId === 'string' ? message.workflowId : undefined;
    if (!workflowId) {
      return { success: false, error: 'No workflow id provided' };
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

    try {
      await this.ensureContentScript(tabId);
      const response = (await chrome.tabs.sendMessage(tabId, {
        type: 'EXECUTE_WORKFLOW',
        workflow
      })) as { success?: boolean; error?: string };

      if (response?.success === false) {
        run.status = 'failed';
        run.endTime = Date.now();
        await this.executions.saveExecutionRun(run);
        return { success: false, error: response.error ?? 'Workflow execution failed' };
      }

      run.status = 'success';
    } catch (error) {
      run.status = 'failed';
      run.endTime = Date.now();
      await this.executions.saveExecutionRun(run);
      return { success: false, error: describeError(error) };
    }

    run.endTime = Date.now();
    await this.executions.saveExecutionRun(run);
    return { success: true, runId: run.id };
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
