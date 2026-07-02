# Hineh Meditation App

## What changed
- Added three daily meditation entries: `Meditation I`, `Meditation II`, `Meditation III`.
- Added PWA support with `manifest.webmanifest`, `service-worker.js`, and `icon.svg`.
- Added runtime conversion for any remaining `Scripture text for ...` values into `read: ...` prompts.
- Updated `index.html` with install metadata for mobile.

## Run locally
1. Open a terminal in `hineh-app`.
2. Start a simple HTTP server:
   - Python 3: `python -m http.server 8000`
   - Or Node: `npx serve .`
3. Open `http://localhost:8000` in your browser.

## Install on phone
- Open the site in a mobile browser.
- Use browser menu: `Add to Home screen` or `Install app`.
- On iOS Safari, use `Share > Add to Home Screen`.

## Notes
- The app uses ES modules, so it should be served over HTTP rather than opened directly from the file system.
- The service worker caches the app shell for offline / installable behavior.
