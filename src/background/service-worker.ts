import { MessageRouter } from './message-router';
import { IndexedDBStorage } from '../storage/indexeddb';
import { WorkflowRepository } from '../storage/workflow-repository';
import { ExecutionRepository } from '../storage/execution-repository';

chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error('Failed to configure side panel behavior:', error));
});

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
