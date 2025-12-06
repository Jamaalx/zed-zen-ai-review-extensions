// content.js - Main content script for the Chrome extension (SaaS version)

// API Configuration - Must match popup.js
const API_BASE_URL = 'https://zed-zen-ai-review-extensions-production.up.railway.app';

class ReviewAssistant {
  constructor() {
    this.token = null;
    this.user = null;
    this.model = 'gpt-4';
    this.isExtensionActive = false;
    this.init();
  }

  async init() {
    // Get stored auth token and model
    const result = await chrome.storage.sync.get(['authToken', 'selectedModel']);
    this.token = result.authToken;
    this.model = result.selectedModel || 'gpt-4';

    // Create the floating assistant panel
    this.createAssistantPanel();

    // Listen for review extraction requests
    this.setupReviewExtraction();

    // Listen for messages from popup
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'toggleExtension') {
        this.toggleExtension();
      } else if (request.action === 'authUpdate') {
        this.token = request.token;
        this.user = request.user;
        this.updatePanelAuthState();
      }
    });

    // Update panel auth state on load
    this.updatePanelAuthState();
  }

  createAssistantPanel() {
    // Remove existing panel if it exists
    const existingPanel = document.getElementById('review-assistant-panel');
    if (existingPanel) {
      existingPanel.remove();
    }

    // Create the main panel
    const panel = document.createElement('div');
    panel.id = 'review-assistant-panel';
    panel.className = 'review-assistant-panel';

    panel.innerHTML = `
      <div class="panel-header">
        <h3>ZedZen Assistant</h3>
        <button id="toggle-panel" class="toggle-btn">-</button>
      </div>
      <div class="panel-content">
        <!-- Auth required message -->
        <div id="auth-required" class="auth-required" style="display: none;">
          <p>Please login to use the assistant</p>
          <small>Click the extension icon to login</small>
        </div>

        <!-- Main content (shown when authenticated) -->
        <div id="main-content">
          <!-- Usage indicator -->
          <div id="usage-indicator" class="usage-indicator">
            <span id="usage-text">Loading...</span>
          </div>

          <div class="review-section">
            <label>Review Text:</label>
            <textarea id="review-text" placeholder="Click 'Extract Review' to get review text automatically or paste review text here..."></textarea>
          </div>

          <div class="controls">
            <button id="extract-review" class="btn btn-primary">Extract Review</button>
            <button id="generate-response" class="btn btn-secondary">Generate Response</button>
          </div>

          <div class="response-section">
            <label>Generated Response:</label>
            <textarea id="generated-response" placeholder="AI-generated response will appear here..."></textarea>
            <div class="response-controls">
              <button id="copy-response" class="btn btn-small">Copy</button>
              <button id="regenerate" class="btn btn-small">Regenerate</button>
            </div>
          </div>

          <div class="settings-section">
            <label>Response Language:</label>
            <select id="response-language">
              <option value="en">English</option>
              <option value="ro">Romana (Romanian)</option>
              <option value="es">Espanol (Spanish)</option>
              <option value="fr">Francais (French)</option>
              <option value="de">Deutsch (German)</option>
              <option value="it">Italiano (Italian)</option>
            </select>

            <label>Response Tone:</label>
            <select id="response-tone">
              <option value="professional">Professional</option>
              <option value="friendly">Friendly</option>
              <option value="apologetic">Apologetic</option>
              <option value="grateful">Grateful</option>
            </select>
          </div>

          <div id="loading" class="loading hidden">
            <div class="spinner"></div>
            <span>Generating response...</span>
          </div>

          <div id="error-message" class="error-message hidden"></div>
        </div>
      </div>
    `;

    document.body.appendChild(panel);
    this.setupPanelEvents();
  }

  setupPanelEvents() {
    // Toggle panel visibility
    document.getElementById('toggle-panel').addEventListener('click', () => {
      const content = document.querySelector('.panel-content');
      const toggleBtn = document.getElementById('toggle-panel');

      if (content.style.display === 'none') {
        content.style.display = 'block';
        toggleBtn.textContent = '-';
      } else {
        content.style.display = 'none';
        toggleBtn.textContent = '+';
      }
    });

    // Extract review button
    document.getElementById('extract-review').addEventListener('click', () => {
      this.extractReviewFromPage();
    });

    // Generate response button
    document.getElementById('generate-response').addEventListener('click', () => {
      this.generateResponse();
    });

    // Copy response button
    document.getElementById('copy-response').addEventListener('click', () => {
      this.copyResponse();
    });

    // Regenerate button
    document.getElementById('regenerate').addEventListener('click', () => {
      this.generateResponse();
    });

    // Make panel draggable
    this.makePanelDraggable();
  }

  updatePanelAuthState() {
    const authRequired = document.getElementById('auth-required');
    const mainContent = document.getElementById('main-content');

    if (this.token) {
      authRequired.style.display = 'none';
      mainContent.style.display = 'block';
      this.loadUsage();
    } else {
      authRequired.style.display = 'block';
      mainContent.style.display = 'none';
    }
  }

  async loadUsage() {
    if (!this.token) return;

    try {
      const response = await this.apiCall('/api/ai/usage');
      const usage = response.usage;

      const usageText = document.getElementById('usage-text');
      usageText.textContent = `${usage.remaining}/${usage.limit} responses left today`;

      const usageIndicator = document.getElementById('usage-indicator');
      if (usage.remaining === 0) {
        usageIndicator.classList.add('exhausted');
        usageText.textContent = 'Daily limit reached - Upgrade for more!';
      } else if (usage.remaining <= 2) {
        usageIndicator.classList.add('warning');
      }
    } catch (error) {
      console.error('Failed to load usage:', error);
    }
  }

  extractReviewFromPage() {
    // Try to find review text in various possible selectors
    const reviewSelectors = [
      '[data-review-text]',
      '.review-text',
      '[jsname="bN97Pc"]',
      '.ODSEW-ShBeI-text',
      '.rsqaWe',
      '.MyEned span[jsname="bN97Pc"]',
      '.d4r55',
      '.ODSEW-ShBeI-content span',
      '.review-content',
      '.user-review',
      '[aria-label*="review"]'
    ];

    let reviewText = '';

    // Try each selector
    for (const selector of reviewSelectors) {
      const elements = document.querySelectorAll(selector);
      for (const element of elements) {
        const text = element.textContent.trim();
        if (text && text.length > 10 && !text.includes('Google') && !text.includes('Map')) {
          reviewText = text;
          break;
        }
      }
      if (reviewText) break;
    }

    // If still no review found, try to find it in the currently visible modal or dialog
    if (!reviewText) {
      const modalSelectors = [
        '.review-dialog-content',
        '.ODSEW-ShBeI-content',
        '[data-review-id]'
      ];

      for (const selector of modalSelectors) {
        const modal = document.querySelector(selector);
        if (modal) {
          const textContent = modal.textContent.trim();
          if (textContent && textContent.length > 10) {
            reviewText = textContent;
            break;
          }
        }
      }
    }

    // Update the textarea with found review text
    const reviewTextArea = document.getElementById('review-text');
    if (reviewText) {
      reviewTextArea.value = reviewText;
      this.showMessage('Review extracted successfully!', 'success');
    } else {
      this.showMessage('No review text found. Please paste the review manually.', 'warning');
    }
  }

  async generateResponse() {
    const reviewText = document.getElementById('review-text').value.trim();
    const tone = document.getElementById('response-tone').value;
    const language = document.getElementById('response-language').value;

    if (!reviewText) {
      this.showMessage('Please enter or extract a review first.', 'error');
      return;
    }

    if (!this.token) {
      this.showMessage('Please login to generate responses.', 'error');
      return;
    }

    this.showLoading(true);

    try {
      const response = await this.apiCall('/api/ai/generate-response', {
        method: 'POST',
        body: JSON.stringify({
          reviewText,
          language,
          tone,
          model: this.model
        })
      });

      document.getElementById('generated-response').value = response.response;
      this.showMessage('Response generated successfully!', 'success');

      // Update usage display
      if (response.usage) {
        const usageText = document.getElementById('usage-text');
        usageText.textContent = `${response.usage.remaining}/${response.usage.limit} responses left today`;

        const usageIndicator = document.getElementById('usage-indicator');
        if (response.usage.remaining === 0) {
          usageIndicator.classList.add('exhausted');
        }
      }

    } catch (error) {
      if (error.message.includes('Daily limit')) {
        this.showMessage('Daily limit reached! Upgrade your plan for more responses.', 'error');
      } else {
        this.showMessage('Error generating response: ' + error.message, 'error');
      }
    } finally {
      this.showLoading(false);
    }
  }

  async apiCall(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;

    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || data.message || 'Request failed');
    }

    return data;
  }

  copyResponse() {
    const responseText = document.getElementById('generated-response').value;
    if (!responseText) {
      this.showMessage('No response to copy.', 'warning');
      return;
    }

    navigator.clipboard.writeText(responseText).then(() => {
      this.showMessage('Response copied to clipboard!', 'success');
    }).catch(() => {
      this.showMessage('Failed to copy response.', 'error');
    });
  }

  showLoading(show) {
    const loading = document.getElementById('loading');
    loading.classList.toggle('hidden', !show);
  }

  showMessage(message, type) {
    const errorDiv = document.getElementById('error-message');
    errorDiv.textContent = message;
    errorDiv.className = `message ${type}`;
    errorDiv.classList.remove('hidden');

    setTimeout(() => {
      errorDiv.classList.add('hidden');
    }, 4000);
  }

  makePanelDraggable() {
    const panel = document.getElementById('review-assistant-panel');
    const header = panel.querySelector('.panel-header');

    let isDragging = false;
    let currentX;
    let currentY;
    let initialX;
    let initialY;
    let xOffset = 0;
    let yOffset = 0;

    header.addEventListener('mousedown', dragStart);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', dragEnd);

    function dragStart(e) {
      initialX = e.clientX - xOffset;
      initialY = e.clientY - yOffset;

      if (e.target === header || header.contains(e.target)) {
        isDragging = true;
        header.style.cursor = 'grabbing';
      }
    }

    function drag(e) {
      if (isDragging) {
        e.preventDefault();
        currentX = e.clientX - initialX;
        currentY = e.clientY - initialY;

        xOffset = currentX;
        yOffset = currentY;

        panel.style.transform = `translate3d(${currentX}px, ${currentY}px, 0)`;
      }
    }

    function dragEnd() {
      initialX = currentX;
      initialY = currentY;
      isDragging = false;
      header.style.cursor = 'grab';
    }
  }

  toggleExtension() {
    const panel = document.getElementById('review-assistant-panel');
    if (panel) {
      panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    }
  }

  setupReviewExtraction() {
    // Listen for clicks on review elements to auto-extract
    document.addEventListener('click', (e) => {
      const reviewSelectors = [
        '.review-text',
        '[data-review-text]',
        '.MyEned span',
        '.ODSEW-ShBeI-text'
      ];

      for (const selector of reviewSelectors) {
        if (e.target.matches(selector) || e.target.closest(selector)) {
          setTimeout(() => this.extractReviewFromPage(), 100);
          break;
        }
      }
    });
  }
}

// Initialize the extension when the page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new ReviewAssistant();
  });
} else {
  new ReviewAssistant();
}
