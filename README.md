# ZedZen Review Assistant

A Chrome browser extension that helps businesses quickly generate professional, AI-powered responses to customer reviews on Google Business profiles using OpenAI's language models.

## Overview

ZedZen Review Assistant streamlines the review response process by automatically extracting customer reviews from Google pages and generating contextually appropriate, professional responses. The extension integrates seamlessly with Google Business profiles and leverages GPT models to create high-quality, publication-ready responses.

## Features

### Response Customization
- **Multiple Languages**: English, Romanian, Spanish, French, German, Italian
- **Tone Options**: Professional, Friendly, Apologetic, Grateful
- **AI Models**: Support for GPT-3.5 Turbo, GPT-4, and GPT-4 Turbo

### User Interface
- Floating draggable panel that overlays on Google pages
- Toggle minimize/expand functionality
- Real-time loading indicators during API calls
- Toast notifications for success/error/warning messages
- Dark mode support

### Smart Features
- Automatic review extraction using intelligent DOM selectors
- One-click copy to clipboard
- Response regeneration with same settings
- Badge indicator showing API key status
- Secure API key masking in display

## Installation

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked" and select the extension folder
5. The extension icon will appear in your browser toolbar

## Setup

1. Click on the extension icon in your toolbar
2. Enter your OpenAI API key (obtain one from [platform.openai.com](https://platform.openai.com))
3. Select your preferred GPT model
4. Save your settings

## Usage

1. Navigate to a Google Business profile with reviews
2. The floating ZedZen panel will appear in the top-right corner
3. Click "Extract Review" to automatically capture the review text
4. Select your preferred language and tone
5. Click "Generate Response" to create an AI-powered reply
6. Review, edit if needed, and copy the response

## API Key Storage

**Important Security Information**: Your OpenAI API key is securely stored using **Chrome's Storage API** (specifically `chrome.storage.sync`), which is part of the Chromium browser's built-in storage system.

### How it works:
- The API key is stored in Chromium's encrypted sync storage
- The key syncs across your Chrome browsers when signed in to your Google account
- The key is masked in the UI (showing only the first 7 and last 4 characters)
- No sensitive data is stored in local files or localStorage

### Security measures:
- API key format validation (must start with "sk-")
- HTTPS-only communication with OpenAI API
- No external servers - direct communication with OpenAI

## Project Structure

```
zed-zen-ai-review-extensions/
├── manifest.json          # Extension configuration (Manifest V3)
├── background.js          # Service worker for extension lifecycle
├── content.js             # Main logic for review extraction & response generation
├── popup.js               # Popup interface controller
├── popup.html             # Settings UI
├── welcome.html           # Onboarding page shown after installation
├── styles.css             # Styling for the floating panel
└── icons/
    ├── icon16.png
    ├── icon32.png
    ├── icon48.png
    └── icon128.png
```

## Technologies

- **JavaScript** (Vanilla ES6+)
- **Chrome Extension API** (Manifest V3)
- **OpenAI API** (Chat Completions)
- **HTML5 / CSS3** with modern design patterns

## Permissions

The extension requires the following permissions:
- `activeTab` - Access the current tab to inject the review panel
- `storage` - Store API key and settings securely
- `scripting` - Inject content scripts into Google pages

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is open source. Please check the repository for license details.

---

**Note**: This extension requires a valid OpenAI API key to function. API usage is subject to OpenAI's pricing and usage policies.
