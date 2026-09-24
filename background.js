// background.js - Background service worker for the extension

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // Open setup tab
    chrome.tabs.create({
      url: chrome.runtime.getURL('welcome.html')
    });
  }
});

// Handle messages from content script and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'generateResponse') {
    // Only this extension's own content script may ask; the API key never leaves
    // the service worker (it is not handed to the google.com renderer).
    if (sender.id !== chrome.runtime.id) return;
    callOpenAI(request.body)
      .then((text) => sendResponse({ ok: true, text }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
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

// OpenAI Responses API call, made from the service worker so the API key is
// never exposed to web page processes.
async function callOpenAI(body) {
  const { openaiApiKey } = await chrome.storage.sync.get(['openaiApiKey']);
  if (!openaiApiKey) {
    throw new Error('Please set your OpenAI API key in the extension popup.');
  }

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${openaiApiKey}`
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    let detail = '';
    try {
      const err = await response.json();
      detail = err?.error?.message ? `: ${err.error.message}` : '';
    } catch (_) { /* non-JSON error body */ }
    throw new Error(`OpenAI API error ${response.status}${detail}`);
  }

  const data = await response.json();
  const text = (data.output || [])
    .filter((item) => item.type === 'message')
    .flatMap((item) => item.content || [])
    .filter((part) => part.type === 'output_text')
    .map((part) => part.text)
    .join('')
    .trim();
  if (!text) {
    throw new Error('OpenAI returned an empty response');
  }
  return text;
}
