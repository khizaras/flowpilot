import { MessageRouter } from './message-router';

// Create message router instance
const messageRouter = new MessageRouter();

// Handle extension installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('FlowPilot extension installed');
});

// Handle extension startup
chrome.runtime.onStartup.addListener(() => {
  console.log('FlowPilot extension started');
});

// Listen for messages from content scripts and other extension components
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Route messages through our message router
  messageRouter.handleMessage(message, sender, sendResponse);

  // Keep the message channel open for async responses
  return true;
});

// Handle side panel opening
chrome.sidePanel.setPanelBehavior({
  openPanelOnActionClick: true
});

// Handle tab updates for recording state
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    // Notify content script about tab change
    chrome.tabs.sendMessage(tabId, {
      type: 'TAB_CHANGED',
      url: tab.url
    });
  }
});

// Handle tab activation
chrome.tabs.onActivated.addListener((activeInfo) => {
  // Notify content script about tab activation
  chrome.tabs.sendMessage(activeInfo.tabId, {
    type: 'TAB_ACTIVATED'
  });
});

console.log('FlowPilot service worker initialized');