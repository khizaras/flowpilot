import { Recorder } from './recorder';
import { Executor } from './executor';
import { showExecutionBadge, showExecutionResult } from './overlay';
import type { WorkflowStep } from '../shared/types';

// Create recorder and executor instances
const recorder = new Recorder();
const executor = new Executor();

// Adopt an in-progress recording after page loads/reloads/navigations
void recorder.init();

// Listen for messages targeted at this tab (sent with chrome.tabs.sendMessage).
// Broadcasts from extension pages (runtime.sendMessage) are ignored - the
// service worker owns session state and run orchestration
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!sender?.tab) {
    return;
  }

  const msg = (message ?? {}) as {
    type?: string;
    step?: WorkflowStep;
    timeoutMs?: number;
    current?: number;
    total?: number;
    status?: string;
    error?: string;
  };

  switch (msg.type) {
    case 'START_RECORDING':
      recorder.startRecording();
      sendResponse({ success: true, message: 'Recording started' });
      break;

    case 'STOP_RECORDING':
      void recorder.stopRecording()
        .then(() => sendResponse({ success: true }))
        .catch(() => sendResponse({ success: false }));
      return true; // Keep message channel open for async response

    case 'EXECUTE_STEP':
      if (msg.step) {
        executor.executeSingleStep(msg.step, msg.timeoutMs)
          .then(result => sendResponse({ success: result }))
          .catch((error: unknown) => sendResponse({ success: false, error: error instanceof Error ? error.message : String(error) }));
        return true; // Keep message channel open for async response
      }
      sendResponse({ success: false, error: 'No step provided' });
      break;

    case 'EXECUTION_BADGE':
      // Progress overlays render only in the top frame
      if (window.self === window.top) {
        if (typeof msg.current === 'number' && typeof msg.total === 'number') {
          showExecutionBadge(msg.current, msg.total);
        } else if (msg.status === 'success') {
          showExecutionResult(true);
        } else if (msg.status === 'failed') {
          showExecutionResult(false, msg.error);
        }
      }
      sendResponse({ success: true });
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

// Select dropdowns fire change (not input) events
document.addEventListener('change', (event) => {
  if (!recorder.getIsRecording()) return;
  const target = event.target;
  if (target instanceof HTMLSelectElement) {
    recorder.recordSelect(
      target,
      target.selectedOptions[0]?.textContent?.trim() ?? target.value
    );
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
