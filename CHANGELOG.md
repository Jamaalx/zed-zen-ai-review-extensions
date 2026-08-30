# Changelog

## 1.1 — 2026-08-30
- Model list updated to GPT-5.6 Sol / Terra / Luna + GPT-4o mini. GPT-4, GPT-4 Turbo and GPT-3.5 Turbo are retired by OpenAI on 2026-10-23; previously saved choices are migrated automatically.
- Requests moved from Chat Completions to the Responses API (`/v1/responses`), which accepts the same parameters for GPT-5.6 and GPT-4o models; API error messages are now shown to the user.
- MIT license added.
- CI: manifest validation, syntax check, zip artifact on every push.

## 1.0 — 2025-11-30
- Initial public release.
