import { Recorder } from './recorder';
import { Executor } from './executor';

// Create recorder and executor instances
const recorder = new Recorder();
const executor = new Executor();

// Listen for messages from the extension
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'START_RECORDING':
      recorder.startRecording();
      sendResponse({ success: true, message: 'Recording started' });
      break;

    case 'STOP_RECORDING':
      const workflow = recorder.stopRecording();
      sendResponse({ success: true, workflow });
      break;

    case 'EXECUTE_WORKFLOW':
      if (message.workflow) {
        executor.executeWorkflow(message.workflow)
          .then(result => sendResponse({ success: true, result }))
          .catch(error => sendResponse({ success: false, error: error.message }));
        return true; // Keep message channel open for async response
      }
      sendResponse({ success: false, error: 'No workflow provided' });
      break;

    case 'GET_RECORDING_STATE':
      sendResponse({
        isRecording: recorder.getIsRecording(),
        stepCount: recorder.getStepCount()
      });
      break;

    case 'TAB_CHANGED':
      // Handle tab change events
      console.log('Tab changed to:', message.url);
      break;

    case 'TAB_ACTIVATED':
      // Handle tab activation
      console.log('Tab activated');
      break;

    default:
      sendResponse({ success: false, error: 'Unknown message type' });
  }
});

// Handle DOM events for recording
document.addEventListener('click', (event) => {
  if (recorder.getIsRecording()) {
    recorder.recordClick(event.target as HTMLElement);
  }
});

document.addEventListener('input', (event) => {
  if (recorder.getIsRecording()) {
    recorder.recordInput(event.target as HTMLInputElement, (event.target as HTMLInputElement).value);
  }
});

document.addEventListener('keydown', (event) => {
  if (recorder.getIsRecording()) {
    recorder.recordKeyDown(event);
  }
});

// Handle page navigation
window.addEventListener('beforeunload', () => {
  if (recorder.getIsRecording()) {
    recorder.stopRecording();
  }
});

console.log('FlowPilot content script initialized');