# Monaco Editor Self-Hosted Configuration for Vite

This document explains how to configure Monaco Editor to load workers locally instead of from CDN when using Vite and Shadow DOM.

## Problem

By default, `@monaco-editor/react` loads Monaco Editor and its web workers from CDN (jsdelivr/unpkg). This fails when:
- The target environment blocks external CDN requests
- You need a completely self-contained bundle
- CSP policies restrict external scripts

## Solution Overview

Three key configurations are required:

1. **Worker Imports**: Use Vite's `?worker` syntax to bundle ESM workers
2. **MonacoEnvironment**: Configure `getWorker` to return worker instances
3. **Shadow DOM CSS**: Inject Monaco's CSS into Shadow DOM

## Implementation

### 1. Entry File (`src/web-components/entry.js`)

```javascript
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'

// Must be set BEFORE Monaco initializes
if (typeof window !== 'undefined') {
  window.MonacoEnvironment = {
    getWorker: function (_workerId, label) {
      if (label === 'json') {
        return new jsonWorker()
      }
      return new editorWorker()
    }
  }
}
```

**Key points:**
- Use `?worker` suffix for Vite to bundle workers as ES modules
- Use `getWorker` (returns Worker instance), NOT `getWorkerUrl` (returns URL string)
- Set `MonacoEnvironment` before any Monaco code runs

### 2. Component File (`src/JsonMakePretty.jsx`)

```javascript
import Editor, { loader } from '@monaco-editor/react'
import * as monaco from 'monaco-editor'

// Use local Monaco instead of CDN
loader.config({ monaco })

loader.init().then((monacoInstance) => {
  console.log('[JSON Formatter] Monaco Editor initialized locally')
})
```

### 3. Shadow DOM CSS Injection (`src/web-components/SafeWrapper.jsx`)

```javascript
import monacoCss from 'monaco-editor/min/vs/editor/editor.main.css?inline'
import cssContent from '../JsonMakePretty.css?inline'

// Inject both Monaco CSS and custom CSS into Shadow DOM
const monacoStyleEl = document.createElement('style')
monacoStyleEl.id = 'monaco-editor-styles'
monacoStyleEl.textContent = monacoCss
shadowRoot.insertBefore(monacoStyleEl, shadowRoot.firstChild)
```

**Why this is needed:**
- Shadow DOM isolates styles from the main document
- Monaco's CSS is normally loaded globally
- Without injection, Monaco renders without line numbers, gutters, or proper formatting

### 4. Vite Configuration (`vite.config.js`)

```javascript
import { defineConfig } from 'vite'

export default defineConfig({
  worker: {
    format: 'es'  // Workers use ES module format
  },
  optimizeDeps: {
    include: ['monaco-editor']  // Pre-bundle Monaco
  }
})
```

**Note:** Do NOT use `vite-plugin-monaco-editor` - it conflicts with manual worker configuration.

## Dependencies

```json
{
  "dependencies": {
    "@monaco-editor/react": "^4.7.0",
    "monaco-editor": "^0.52.0"
  }
}
```

## Verification

### Console Output (Success)
```
[JSON Formatter] Web component registered successfully
[JSON Formatter] Monaco Editor initialized locally
[JSON Formatter] Styles injected successfully
```

### Network Tab
- Workers load from `localhost` (dev) or your domain (prod)
- NO requests to `cdn.jsdelivr.net`, `unpkg.com`, or `cdnjs.cloudflare.com`

### Visual Check
- Line numbers are visible
- Scrollbars appear on overflow
- JSON syntax highlighting works
- IntelliSense/autocomplete functions

## Common Errors and Fixes

### `define is not defined`
**Cause:** Using AMD-formatted Monaco files (`min/vs/`) with ESM environment
**Fix:** Use ESM workers from `monaco-editor/esm/vs/...`

### `Failed to load worker` / MIME type errors
**Cause:** Incorrect worker path or using `getWorkerUrl` with ESM workers
**Fix:** Use `getWorker` returning `new Worker()` instances

### Monaco renders but no line numbers
**Cause:** Monaco CSS not loaded in Shadow DOM
**Fix:** Import and inject `monaco-editor/min/vs/editor/editor.main.css?inline`

### `W.global is undefined`
**Cause:** Mixing AMD workers with ESM environment
**Fix:** Use `?worker` imports, not manual URL paths

## File Structure

```
src/
├── JsonMakePretty.jsx          # loader.config({ monaco })
├── JsonMakePretty.css          # Custom styles
└── web-components/
    ├── entry.js                # MonacoEnvironment + worker imports
    └── SafeWrapper.jsx         # CSS injection for Shadow DOM
```

## Additional Workers

To add more language support (TypeScript, CSS, HTML), import additional workers:

```javascript
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker'
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker'
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker'

window.MonacoEnvironment = {
  getWorker: function (_workerId, label) {
    switch (label) {
      case 'json': return new jsonWorker()
      case 'typescript':
      case 'javascript': return new tsWorker()
      case 'css':
      case 'scss':
      case 'less': return new cssWorker()
      case 'html':
      case 'handlebars':
      case 'razor': return new htmlWorker()
      default: return new editorWorker()
    }
  }
}
```
