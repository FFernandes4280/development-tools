import r2wc from '@r2wc/react-to-web-component'
import SafeWrapper from './SafeWrapper.jsx'

import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker&inline'
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker&inline'

// Configure Monaco to use local workers BEFORE Monaco initializes
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

try {
  const JsonFormatterWebComponent = r2wc(SafeWrapper, {
    shadow: 'open'
  })

  if (!customElements.get('json-formatter')) {
    customElements.define('json-formatter', JsonFormatterWebComponent)
  }
} catch (err) {
  console.error('[JSON Formatter] Failed to register web component:', err)
}
