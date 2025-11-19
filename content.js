// content.js - Main content script for the Chrome extension

class ReviewAssistant {
  constructor() {
    this.apiKey = null;
    this.isExtensionActive = false;
    this.init();
  }

  async init() {
    // Get stored API key and model
    const result = await chrome.storage.sync.get(['openaiApiKey', 'openaiModel']);
    this.apiKey = result.openaiApiKey;
    this.model = result.openaiModel || 'gpt-4';
    
    // Create the floating assistant panel
    this.createAssistantPanel();
    
    // Listen for review extraction requests
    this.setupReviewExtraction();
    
    // Listen for messages from popup
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'toggleExtension') {
        this.toggleExtension();
      } else if (request.action === 'updateApiKey') {
        this.apiKey = request.apiKey;
        this.model = request.model || 'gpt-4';
      }
    });
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
        <h3>Review Assistant</h3>
        <button id="toggle-panel" class="toggle-btn">âˆ’</button>
      </div>
      <div class="panel-content">
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
            <option value="ro">Română (Romanian)</option>
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
        toggleBtn.textContent = 'âˆ’';
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
      // Generic selectors for review content
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
    
    if (!this.apiKey) {
      this.showMessage('Please set your OpenAI API key in the extension popup.', 'error');
      return;
    }

    this.showLoading(true);
    
    try {
      const response = await this.callOpenAI(reviewText, tone, language);
      document.getElementById('generated-response').value = response;
      this.showMessage('Response generated successfully!', 'success');
    } catch (error) {
      this.showMessage('Error generating response: ' + error.message, 'error');
    } finally {
      this.showLoading(false);
    }
  }

  async callOpenAI(reviewText, tone, language) {
    const prompt = this.buildPrompt(reviewText, tone, language);
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: this.model || 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a professional customer service assistant helping businesses respond to reviews. Generate helpful, appropriate responses in the requested language.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 200,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  buildPrompt(reviewText, tone, language) {
    const languageNames = {
      'en': 'English',
      'ro': 'Romanian (RomÃ¢nÄƒ)', 
      'es': 'Spanish (EspaÃ±ol)',
      'fr': 'French (FranÃ§ais)',
      'de': 'German (Deutsch)',
      'it': 'Italian (Italiano)'
    };

    const toneInstructions = {
      professional: 'Write a professional, business-appropriate response.',
      friendly: 'Write a warm, friendly, and personable response.',
      apologetic: 'Write an apologetic response that acknowledges any issues mentioned.',
      grateful: 'Write a grateful response that thanks the customer for their feedback.'
    };

    const selectedLanguage = languageNames[language] || 'English';

    return `Please write a ${tone} response to this customer review in ${selectedLanguage}. The response should be appropriate for a business owner replying publicly to the review.

Review: "${reviewText}"

Language: ${selectedLanguage}
Tone: ${toneInstructions[tone]}

Requirements:
- Write the response entirely in ${selectedLanguage}
- Keep it concise (under 100 words)
- Be genuine and helpful
- Address specific points mentioned in the review when relevant
- Thank the customer for their feedback
- Include a call to action when appropriate (visit again, contact directly, etc.)
- Use natural, native-level ${selectedLanguage}
- End with a proper thank you or invitation, NOT with placeholder text like [Name] or [Your Name]
- Write a complete response that needs no additional editing

Write only the response text, nothing else:`;
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
    }, 3000);
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
      // Auto-extract when clicking on review text elements
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