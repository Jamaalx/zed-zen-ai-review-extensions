// popup.js - Extension popup with authentication

// API Configuration - Change this to your Railway URL after deployment
const API_BASE_URL = 'https://your-app.railway.app'; // TODO: Update with your Railway URL

class PopupManager {
  constructor() {
    this.token = null;
    this.user = null;
    this.init();
  }

  async init() {
    // Check for stored token
    await this.checkAuth();
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Tab switching
    document.getElementById('login-tab').addEventListener('click', () => this.switchTab('login'));
    document.getElementById('register-tab').addEventListener('click', () => this.switchTab('register'));

    // Auth forms
    document.getElementById('login-btn').addEventListener('click', () => this.login());
    document.getElementById('register-btn').addEventListener('click', () => this.register());

    // Enter key on forms
    document.getElementById('login-password').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.login();
    });
    document.getElementById('register-password').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.register();
    });

    // Dashboard actions
    document.getElementById('toggle-btn').addEventListener('click', () => this.togglePanel());
    document.getElementById('upgrade-btn').addEventListener('click', () => this.openUpgrade());
    document.getElementById('manage-btn').addEventListener('click', () => this.openManage());
    document.getElementById('logout-btn').addEventListener('click', () => this.logout());

    // Model selection
    document.getElementById('modelSelect').addEventListener('change', (e) => this.saveModel(e.target.value));
  }

  // Check if user is authenticated
  async checkAuth() {
    try {
      const result = await chrome.storage.sync.get(['authToken', 'selectedModel']);

      if (result.authToken) {
        this.token = result.authToken;

        // Verify token with API
        const response = await this.apiCall('/api/auth/me');

        if (response.user) {
          this.user = response.user;
          await this.loadUsage();
          this.showDashboard();

          // Set saved model
          if (result.selectedModel) {
            document.getElementById('modelSelect').value = result.selectedModel;
          }

          // Notify content script
          this.notifyContentScript();
          return;
        }
      }
    } catch (error) {
      console.log('Auth check failed:', error);
      // Token invalid, clear it
      await chrome.storage.sync.remove(['authToken']);
    }

    this.showAuthView();
  }

  // Switch between login and register tabs
  switchTab(tab) {
    const loginTab = document.getElementById('login-tab');
    const registerTab = document.getElementById('register-tab');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');

    if (tab === 'login') {
      loginTab.classList.add('active');
      registerTab.classList.remove('active');
      loginForm.style.display = 'block';
      registerForm.style.display = 'none';
    } else {
      loginTab.classList.remove('active');
      registerTab.classList.add('active');
      loginForm.style.display = 'none';
      registerForm.style.display = 'block';
    }
  }

  // Login
  async login() {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    if (!email || !password) {
      this.showNotification('Please enter email and password', 'error');
      return;
    }

    const btn = document.getElementById('login-btn');
    btn.disabled = true;
    btn.innerHTML = '<span class="loading-spinner"></span>Logging in...';

    try {
      const response = await this.apiCall('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });

      // Save token
      this.token = response.token;
      this.user = response.user;
      await chrome.storage.sync.set({ authToken: response.token });

      this.showNotification('Login successful!', 'success');
      await this.loadUsage();
      this.showDashboard();
      this.notifyContentScript();

    } catch (error) {
      this.showNotification(error.message || 'Login failed', 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Login';
    }
  }

  // Register
  async register() {
    const name = document.getElementById('register-name').value.trim();
    const email = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value;

    if (!email || !password) {
      this.showNotification('Please enter email and password', 'error');
      return;
    }

    if (password.length < 6) {
      this.showNotification('Password must be at least 6 characters', 'error');
      return;
    }

    const btn = document.getElementById('register-btn');
    btn.disabled = true;
    btn.innerHTML = '<span class="loading-spinner"></span>Creating account...';

    try {
      const response = await this.apiCall('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password, name })
      });

      // Save token
      this.token = response.token;
      this.user = response.user;
      await chrome.storage.sync.set({ authToken: response.token });

      this.showNotification('Account created successfully!', 'success');
      await this.loadUsage();
      this.showDashboard();
      this.notifyContentScript();

    } catch (error) {
      this.showNotification(error.message || 'Registration failed', 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Create Account';
    }
  }

  // Logout
  async logout() {
    try {
      await this.apiCall('/api/auth/logout', { method: 'POST' });
    } catch (error) {
      // Ignore errors
    }

    this.token = null;
    this.user = null;
    await chrome.storage.sync.remove(['authToken']);

    this.showNotification('Logged out', 'success');
    this.showAuthView();
    this.notifyContentScript();
  }

  // Load usage data
  async loadUsage() {
    try {
      const response = await this.apiCall('/api/ai/usage');
      this.updateUsageDisplay(response.usage);
    } catch (error) {
      console.error('Failed to load usage:', error);
    }
  }

  // Update usage display
  updateUsageDisplay(usage) {
    const usageCount = document.getElementById('usage-count');
    const usageFill = document.getElementById('usage-fill');

    usageCount.textContent = `${usage.used} / ${usage.limit}`;

    const percentage = (usage.used / usage.limit) * 100;
    usageFill.style.width = `${Math.min(percentage, 100)}%`;

    // Color based on usage
    usageFill.classList.remove('warning', 'danger');
    if (percentage >= 90) {
      usageFill.classList.add('danger');
    } else if (percentage >= 70) {
      usageFill.classList.add('warning');
    }

    // Update status
    const statusIndicator = document.getElementById('statusIndicator');
    const statusText = document.getElementById('statusText');

    if (usage.remaining > 0) {
      statusIndicator.className = 'status-indicator active';
      statusText.textContent = `${usage.remaining} responses remaining today`;
    } else {
      statusIndicator.className = 'status-indicator inactive';
      statusText.textContent = 'Daily limit reached - Upgrade for more!';
    }
  }

  // Open Stripe checkout for upgrade
  async openUpgrade() {
    try {
      // Determine which plan to offer based on current plan
      let planId;
      switch (this.user.plan) {
        case 'free':
          planId = 'basic';
          break;
        case 'basic':
          planId = 'premium';
          break;
        case 'premium':
          planId = 'enterprise';
          break;
        default:
          planId = 'basic';
      }

      const response = await this.apiCall('/api/stripe/create-checkout-session', {
        method: 'POST',
        body: JSON.stringify({ planId })
      });

      if (response.url) {
        chrome.tabs.create({ url: response.url });
      }
    } catch (error) {
      this.showNotification('Failed to open upgrade page', 'error');
    }
  }

  // Open Stripe customer portal
  async openManage() {
    try {
      const response = await this.apiCall('/api/stripe/create-portal-session', {
        method: 'POST'
      });

      if (response.url) {
        chrome.tabs.create({ url: response.url });
      }
    } catch (error) {
      this.showNotification('No subscription to manage', 'error');
    }
  }

  // Toggle extension panel
  async togglePanel() {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'toggleExtension' }).catch(() => {
          this.showNotification('Please refresh the page', 'error');
        });
      }
    } catch (error) {
      this.showNotification('Error toggling panel', 'error');
    }
  }

  // Save selected model
  async saveModel(model) {
    await chrome.storage.sync.set({ selectedModel: model });
    this.notifyContentScript();
  }

  // Notify content script of auth changes
  async notifyContentScript() {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'authUpdate',
          isAuthenticated: !!this.token,
          token: this.token,
          user: this.user
        }).catch(() => {
          // Content script not loaded, that's ok
        });
      }
    } catch (error) {
      // Ignore
    }
  }

  // Show views
  showAuthView() {
    document.getElementById('loading-view').classList.remove('active');
    document.getElementById('dashboard-view').classList.remove('active');
    document.getElementById('auth-view').classList.add('active');
  }

  showDashboard() {
    document.getElementById('loading-view').classList.remove('active');
    document.getElementById('auth-view').classList.remove('active');
    document.getElementById('dashboard-view').classList.add('active');

    // Update user info
    if (this.user) {
      document.getElementById('user-email').textContent = this.user.email;
      document.getElementById('user-avatar').textContent = this.user.email.charAt(0).toUpperCase();

      // Update plan badge
      const planBadge = document.getElementById('plan-badge');
      planBadge.textContent = this.user.plan.toUpperCase();
      planBadge.className = `plan-badge ${this.user.plan}`;

      // Update upgrade button text
      const upgradeBtn = document.getElementById('upgrade-btn');
      switch (this.user.plan) {
        case 'enterprise':
          upgradeBtn.style.display = 'none'; // Already on highest plan
          break;
        case 'premium':
          upgradeBtn.textContent = 'Upgrade to Enterprise';
          break;
        case 'basic':
          upgradeBtn.textContent = 'Upgrade to Premium';
          break;
        default:
          upgradeBtn.textContent = 'Upgrade Plan';
      }
    }
  }

  // API call helper
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
      throw new Error(data.error || 'Request failed');
    }

    return data;
  }

  // Show notification
  showNotification(message, type) {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification ${type}`;

    setTimeout(() => {
      notification.className = 'notification';
    }, 4000);
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new PopupManager();
});
