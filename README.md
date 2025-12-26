# gRPC Panel

A DevTools extension to inspect gRPC-web traffic.

## Build Instructions

### Prerequisites
- Node.js
- npm

### Install Dependencies
```bash
npm install
```

### Build for All Browsers
To build for both Chrome and Firefox at once:
```bash
npm run build
```
This will generate:
- `dist/chrome/`
- `dist/firefox/`

### Build for Specific Browser
**Chrome:**
```bash
npm run build:chrome
```
Output: `dist/chrome/`

**Firefox:**
```bash
npm run build:firefox
```
Output: `dist/firefox/`

## Installation

### Chrome
1. Open Chrome and navigate to `chrome://extensions/`.
2. Enable "Developer mode" in the top right.
3. Click "Load unpacked".
4. Select the `dist/chrome` folder.

### Firefox
1. Open Firefox and navigate to `about:debugging#/runtime/this-firefox`.
2. Click "Load Temporary Add-on...".
3. Select the `manifest.json` file inside the `dist/firefox` folder.

## Development

To watch for changes and rebuild automatically (defaults to Chrome target):
```bash
npm run dev
```

## Technology Stack
- TypeScript
- Webpack
- Sass
