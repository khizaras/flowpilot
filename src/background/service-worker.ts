import { MessageRouter } from './message-router';
import { IndexedDBStorage } from '../storage/indexeddb';
import { WorkflowRepository } from '../storage/workflow-repository';
import { ExecutionRepository } from '../storage/execution-repository';

const TICKER_ALARM = 'flowpilot-ticker';

chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error('Failed to configure side panel behavior:', error));
  // Alarms are cleared when the extension (re)loads; arm the ticker again
  createTicker();
});

chrome.runtime.onStartup.addListener(() => {
  createTicker();
});

function createTicker(): void {
  try {
    chrome.alarms.create(TICKER_ALARM, { periodInMinutes: 1 });
  } catch (error) {
    console.error('Failed to create the schedule ticker:', error);
  }
}

createTicker();

const routerPromise = createRouter();

async function createRouter(): Promise<MessageRouter> {
  const storage = new IndexedDBStorage();
  await storage.init();
  return new MessageRouter(
    new WorkflowRepository(storage),
    new ExecutionRepository(storage)
  );
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  void routerPromise.then(
    (router) => router.handleMessage(message, sender, sendResponse),
    () => sendResponse({ success: false, error: 'Storage layer failed to initialize' })
  );
  // Keep the message channel open for the async response
  return true;
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name !== TICKER_ALARM) {
    return;
  }
  void routerPromise
    .then((router) => router.tickScheduledWorkflows())
    .catch((error) => console.error('Schedule tick failed:', error));
});
