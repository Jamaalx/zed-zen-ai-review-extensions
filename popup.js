// popup.js - Extension popup functionality

class PopupManager {
  constructor() {
    this.init();
  }

  async init() {
    // Load saved API key
    await this.loadApiKey();
    
    // Update status
    this.updateStatus();
    
    // Setup event listeners
    this.setupEventListeners();
  }

  setupEventListeners() {
    document.getElementById('saveBtn').addEventListener('click', () => {
      this.saveApiKey();
    });

    document.getElementById('toggleBtn').addEventListener('click', () => {
      this.toggleExtensionPanel();
    });

    document.getElementById('apiKey').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.saveApiKey();
      }
    });
  }

  async loadApiKey() {
    try {
      const result = await chrome.storage.sync.get(['openaiApiKey', 'openaiModel']);
      if (result.openaiApiKey) {
        const maskedKey = this.maskApiKey(result.openaiApiKey);
        document.getElementById('apiKey').placeholder = maskedKey;
      }
      const RETIRED_MODELS = { 'gpt-4': 'gpt-5.6-sol', 'gpt-4-turbo': 'gpt-5.6-sol', 'gpt-3.5-turbo': 'gpt-5.6-terra' };
      if (result.openaiModel) {
        const model = RETIRED_MODELS[result.openaiModel] || result.openaiModel;
        const select = document.getElementById('modelSelect');
        select.value = model;
        if (select.value !== model) select.value = 'gpt-5.6-terra'; // unknown id → default
        if (model !== result.openaiModel) await chrome.storage.sync.set({ openaiModel: select.value });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }

  async saveApiKey() {
    const apiKey = document.getElementById('apiKey').value.trim();
    const selectedModel = document.getElementById('modelSelect').value;
    
    if (!apiKey) {
      this.showNotification('Please enter an API key', 'error');
      return;
    }

    if (!apiKey.startsWith('sk-')) {
      this.showNotification('Invalid API key format. Key should start with "sk-"', 'error');
      return;
    }

    try {
      await chrome.storage.sync.set({ 
        openaiApiKey: apiKey,
        openaiModel: selectedModel
      });
      
      // Send message to content script
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'updateApiKey',
          apiKey: apiKey,
          model: selectedModel
        }).catch(() => {
          // Content script might not be loaded, that's okay
        });
      }

      this.showNotification(`Settings saved! Using ${selectedModel}`, 'success');
      
      // Clear input and update placeholder
      const maskedKey = this.maskApiKey(apiKey);
      document.getElementById('apiKey').value = '';
      document.getElementById('apiKey').placeholder = maskedKey;
      
      this.updateStatus();
    } catch (error) {
      console.error('Error saving settings:', error);
      this.showNotification('Error saving settings', 'error');
    }
  }

  async toggleExtensionPanel() {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'toggleExtension' }).catch(() => {
          this.showNotification('Please refresh the page and try again', 'error');
        });
      }
    } catch (error) {
      console.error('Error toggling extension:', error);
      this.showNotification('Error toggling extension panel', 'error');
    }
  }

  async updateStatus() {
    const result = await chrome.storage.sync.get(['openaiApiKey']);
    const statusIndicator = document.getElementById('statusIndicator');
    const statusText = document.getElementById('statusText');
    
    if (result.openaiApiKey) {
      statusIndicator.className = 'status-indicator active';
      statusText.textContent = 'Ready to generate responses';
    } else {
      statusIndicator.className = 'status-indicator inactive';
      statusText.textContent = 'API key required';
    }
  }

  maskApiKey(apiKey) {
    if (!apiKey || apiKey.length < 10) return apiKey;
    const start = apiKey.substring(0, 7);
    const end = apiKey.substring(apiKey.length - 4);
    return `${start}...${end}`;
  }

  showNotification(message, type) {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification ${type}`;
    notification.style.display = 'block';
    
    setTimeout(() => {
      notification.style.display = 'none';
    }, 3000);
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new PopupManager();
});