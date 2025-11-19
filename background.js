// background.js - Background service worker for the extension

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // Open setup tab
    chrome.tabs.create({
      url: chrome.runtime.getURL('welcome.html')
    });
  }
});

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
  // Check if we're on a Google page
  if (tab.url.includes('google.com')) {
    chrome.tabs.sendMessage(tab.id, { action: 'toggleExtension' }).catch(() => {
      // If content script isn't loaded, inject it
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      });
    });
  } else {
    // Navigate user to Google instead of showing notification
    console.log('Please navigate to a Google Business profile to use the extension.');
  }
});

// Handle messages from content script and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getApiKey') {
    chrome.storage.sync.get(['openaiApiKey']).then((result) => {
      sendResponse({ apiKey: result.openaiApiKey });
    });
    return true; // Keep message channel open
  }
  
  if (request.action === 'showNotification') {
    // Log notifications instead of showing them for now
    console.log(`Notification: ${request.title || 'ZedZen Review Assistant'} - ${request.message}`);
  }
});

// Update badge text based on API key status
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'sync' && changes.openaiApiKey) {
    updateBadge();
  }
});

async function updateBadge() {
  const result = await chrome.storage.sync.get(['openaiApiKey']);
  const tabs = await chrome.tabs.query({});
  
  tabs.forEach((tab) => {
    if (tab.url && tab.url.includes('google.com')) {
      chrome.action.setBadgeText({
        text: result.openaiApiKey ? '✓' : '!',
        tabId: tab.id
      });
      
      chrome.action.setBadgeBackgroundColor({
        color: result.openaiApiKey ? '#10B981' : '#EF4444',
        tabId: tab.id
      });
    }
  });
}

// Initialize badge on startup
chrome.runtime.onStartup.addListener(() => {
  updateBadge();
});

// Handle tab updates to show/hide badge on Google pages
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    if (tab.url.includes('google.com')) {
      updateBadge();
    } else {
      chrome.action.setBadgeText({
        text: '',
        tabId: tabId
      });
    }
  }
});