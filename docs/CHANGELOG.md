# Changelog

All notable changes to Spark for Brightspace are documented here.

---

## [Unreleased]

### Added

- **Uninstall feedback page.** When the extension is uninstalled Chrome now opens `docs/uninstall.html` — a "Sorry to see you go!" page that presents a short multiple-choice survey (with an "Other" free-text option) asking why the user left. Responses are collected by a Google Apps Script web app (`scripts/uninstall-feedback.gs`) and written to a private Google Sheet.
- **Anonymous install analytics.** On first install the background service worker generates a random UUID via `crypto.randomUUID()` and persists it in `chrome.storage.local` under `spark-client-id`. The ID is stable for the lifetime of the installation and is used to distinguish unique installs in analytics. No personal data is involved — the ID is a locally-generated random value with no link to any account, device, or identity.

---

## [1.2.1] — 2026-04-23

### Improved

- **Smarter automatic fetching.** Data fetches no longer depend solely on a full page reload.
  - Switching to a D2L tab now triggers a fetch if the 5-minute cooldown has elapsed.
  - Mouse movement or page scrolling (debounced 2 s) also triggers a fetch once the cooldown has lifted.
  - A full page reload always triggers a fetch unconditionally, bypassing the cooldown.
  - The manual refresh button inside the extension panel is unaffected by the cooldown and always fetches immediately.
- **Fetch on first install without a page reload.** When the extension is installed or re-enabled, the content script and styles are programmatically injected into any already-open Brightspace tabs. Previously, users had to manually reload every open tab before the extension became active.
- **Fetch on extension re-enable and browser restart.** The background service worker now detects cold starts (first install, re-enable, browser restart) via `chrome.storage.session` and re-injects into open Brightspace tabs automatically.
