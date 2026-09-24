# ZedZen Review Assistant

[![CI](https://github.com/Jamaalx/zed-zen-ai-review-extensions/actions/workflows/ci.yml/badge.svg)](https://github.com/Jamaalx/zed-zen-ai-review-extensions/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A Chrome browser extension that helps businesses quickly generate professional, AI-powered responses to customer reviews on Google Business profiles using OpenAI's language models.

## Overview

ZedZen Review Assistant streamlines the review response process by automatically extracting customer reviews from Google pages and generating contextually appropriate, professional responses. The extension integrates seamlessly with Google Business profiles and leverages GPT models to create high-quality, publication-ready responses.

## Features

### Response Customization
- **Multiple Languages**: English, Romanian, Spanish, French, German, Italian
- **Tone Options**: Professional, Friendly, Apologetic, Grateful
- **AI Models**: GPT-5.6 Sol / Terra / Luna and GPT-4o mini (GPT-4, GPT-4 Turbo and GPT-3.5 Turbo are shut down by OpenAI on 23 Oct 2026; saved settings are migrated automatically)

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
3. Select your preferred model (default: GPT-5.6 Terra)
4. Save your settings

## Usage

1. Navigate to a Google Business profile with reviews
2. The floating ZedZen panel will appear in the top-right corner
3. Click "Extract Review" to automatically capture the review text
4. Select your preferred language and tone
5. Click "Generate Response" to create an AI-powered reply
6. Review, edit if needed, and copy the response

## API Key Storage

Your OpenAI API key is stored with **Chrome's Storage API** (`chrome.storage.sync`).

### How it works:
- The key is kept in the browser profile's extension storage. It is **not** encrypted at rest by the extension, so anyone with access to your Chrome profile can read it — use a project-scoped key with a spending limit.
- The key syncs across your Chrome browsers when you are signed in to your Google account (encrypted in transit by Chrome Sync)
- The key is masked in the UI (showing only the first 7 and last 4 characters)
- Requests to OpenAI are made by the extension's background service worker; the key is never passed to the Google page or its content script

### Security measures:
- API key format validation (must start with "sk-")
- HTTPS-only communication with OpenAI API, restricted by the extension's Content Security Policy
- No external servers - direct communication with OpenAI

## Project Structure

```
zed-zen-ai-review-extensions/
├── manifest.json          # Extension configuration (Manifest V3)
├── background.js          # Service worker: badge, OpenAI API calls
├── content.js             # Floating panel, review extraction, prompt building
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
- **OpenAI API** (Responses API, `/v1/responses`)
- **HTML5 / CSS3** with modern design patterns

## Permissions

The extension requires the following permissions:
- `storage` - Store the API key and settings
- Host access to `https://www.google.com/*` - Show the review panel on Google pages
- Host access to `https://api.openai.com/*` - Send generation requests to OpenAI

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT — see [LICENSE](LICENSE).

---

**Note**: This extension requires a valid OpenAI API key to function. API usage is subject to OpenAI's pricing and usage policies.
