# Changelog

## 1.1.1 — 2026-09-24
- Security: OpenAI requests are made from the background service worker; the API key is no longer handed to the Google page's content script.
- Permissions reduced to `storage` (removed unused `activeTab` and `scripting`); explicit Content Security Policy for extension pages.
- The model can be changed in the popup without re-entering the API key; an unknown saved model is reset to GPT-5.6 Terra and saved.
- Settings changes apply to all open Google tabs.
- Fixed garbled characters in the panel (minus sign) and in the language names sent to the model.
- README: corrected API key storage description and permissions list.
- Dependabot: GitHub Actions updates monthly, grouped.

## 1.1 — 2026-08-30
- Model list updated to GPT-5.6 Sol / Terra / Luna + GPT-4o mini. GPT-4, GPT-4 Turbo and GPT-3.5 Turbo are retired by OpenAI on 2026-10-23; previously saved choices are migrated automatically.
- Requests moved from Chat Completions to the Responses API (`/v1/responses`), which accepts the same parameters for GPT-5.6 and GPT-4o models; API error messages are now shown to the user.
- MIT license added.
- CI: manifest validation, syntax check, zip artifact on every push.

## 1.0 — 2025-11-30
- Initial public release.
