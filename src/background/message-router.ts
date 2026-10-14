/**
 * Message Router for FlowPilot Extension
 * Handles routing and processing of messages between extension components
 */
export class MessageRouter {
  private handlers: Map<string, Function> = new Map();

  constructor() {
    this.initializeHandlers();
  }

  /**
   * Initialize message handlers
   */
  private initializeHandlers(): void {
    // Add default handlers for core extension messages
    this.addHandler('GET_RECORDING_STATE', this.handleGetRecordingState.bind(this));
    this.addHandler('START_RECORDING', this.handleStartRecording.bind(this));
    this.addHandler('STOP_RECORDING', this.handleStopRecording.bind(this));
    this.addHandler('EXECUTE_WORKFLOW', this.handleExecuteWorkflow.bind(this));
    this.addHandler('SAVE_WORKFLOW', this.handleSaveWorkflow.bind(this));
    this.addHandler('LOAD_WORKFLOW', this.handleLoadWorkflow.bind(this));
  }

  /**
   * Add a message handler
   * @param type - Message type to handle
   * @param handler - Handler function
   */
  addHandler(type: string, handler: Function): void {
    this.handlers.set(type, handler);
  }

  /**
   * Handle incoming messages
   * @param message - The incoming message
   * @param sender - Message sender information
   * @param sendResponse - Response callback
   */
  handleMessage(message: any, sender: any, sendResponse: Function): void {
    const handler = this.handlers.get(message.type);

    if (handler) {
      try {
        const result = handler(message, sender);
        if (result instanceof Promise) {
          result.then(response => sendResponse(response))
                .catch(error => sendResponse({ success: false, error: error.message }));
        } else {
          sendResponse(result);
        }
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
    } else {
      // Default handler for unknown messages
      sendResponse({ success: false, error: 'Unknown message type' });
    }
  }

  /**
   * Handle recording state requests
   */
  private async handleGetRecordingState(message: any, sender: any): Promise<any> {
    // In a real implementation, this would check the actual recording state
    return { success: true, isRecording: false, stepCount: 0 };
  }

  /**
   * Handle start recording requests
   */
  private async handleStartRecording(message: any, sender: any): Promise<any> {
    // Send message to content script to start recording
    try {
      await chrome.tabs.sendMessage(sender.tab?.id, { type: 'START_RECORDING' });
      return { success: true, message: 'Recording started' };
    } catch (error) {
      return { success: false, error: 'Failed to start recording' };
    }
  }

  /**
   * Handle stop recording requests
   */
  private async handleStopRecording(message: any, sender: any): Promise<any> {
    // Send message to content script to stop recording
    try {
      const response = await chrome.tabs.sendMessage(sender.tab?.id, { type: 'STOP_RECORDING' });
      return { success: true, workflow: response.workflow };
    } catch (error) {
      return { success: false, error: 'Failed to stop recording' };
    }
  }

  /**
   * Handle workflow execution requests
   */
  private async handleExecuteWorkflow(message: any, sender: any): Promise<any> {
    if (!message.workflow) {
      return { success: false, error: 'No workflow provided' };
    }

    try {
      await chrome.tabs.sendMessage(sender.tab?.id, {
        type: 'EXECUTE_WORKFLOW',
        workflow: message.workflow
      });
      return { success: true, message: 'Workflow execution started' };
    } catch (error) {
      return { success: false, error: 'Failed to execute workflow' };
    }
  }

  /**
   * Handle workflow saving requests
   */
  private async handleSaveWorkflow(message: any, sender: any): Promise<any> {
    // In a real implementation, this would save the workflow to storage
    return { success: true, message: 'Workflow saved' };
  }

  /**
   * Handle workflow loading requests
   */
  private async handleLoadWorkflow(message: any, sender: any): Promise<any> {
    // In a real implementation, this would load a workflow from storage
    return { success: true, workflow: null };
  }
}