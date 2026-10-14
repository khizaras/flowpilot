import { Recorder } from './recorder';
import { Executor } from './executor';

// Create recorder and executor instances
const recorder = new Recorder();
const executor = new Executor();

// Restore an in-progress recording after page loads/reloads/navigations
void recorder.init();

// Listen for messages from the extension
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const msg = (message ?? {}) as { type?: string; workflow?: unknown };

  switch (msg.type) {
    case 'START_RECORDING':
      recorder.startRecording();
      sendResponse({ success: true, message: 'Recording started' });
      break;

    case 'STOP_RECORDING':
      void recorder.stopRecording().then((workflow) => {
        sendResponse({ success: true, workflow });
      });
      return true; // Keep message channel open for async response

    case 'EXECUTE_WORKFLOW':
      if (msg.workflow) {
        executor.executeWorkflow(msg.workflow)
          .then(result => sendResponse({ success: result }))
          .catch((error: unknown) => sendResponse({ success: false, error: error instanceof Error ? error.message : String(error) }));
        return true; // Keep message channel open for async response
      }
      sendResponse({ success: false, error: 'No workflow provided' });
      break;

    case 'GET_RECORDING_STATE':
      sendResponse({
        success: true,
        isRecording: recorder.getIsRecording(),
        stepCount: recorder.getStepCount()
      });
      break;

    default:
      sendResponse({ success: false, error: 'Unknown message type' });
  }
});

// Handle DOM events for recording (capture phase so we observe events
// even if the page stops them from bubbling)
document.addEventListener('click', (event) => {
  if (!recorder.getIsRecording()) return;
  const target = event.target;
  if (target instanceof HTMLElement) {
    recorder.recordClick(target);
  }
}, true);

document.addEventListener('input', (event) => {
  if (!recorder.getIsRecording()) return;
  const target = event.target;
  if (target instanceof HTMLInputElement) {
    recorder.recordInput(target, target.value);
  }
}, true);

document.addEventListener('keydown', (event) => {
  if (!recorder.getIsRecording()) return;
  recorder.recordKeyDown(event);
}, true);

// Flush debounced input steps before the page is hidden or unloaded so
// nothing is lost on navigation
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    recorder.flush();
  }
});
window.addEventListener('beforeunload', () => {
  recorder.flush();
});
