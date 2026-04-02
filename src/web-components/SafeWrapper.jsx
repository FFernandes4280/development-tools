import React, { useEffect, useRef } from 'react';
import JsonMakePretty from '../JsonMakePretty.jsx';
import cssContent from '../JsonMakePretty.css?inline';

import monacoCss from 'monaco-editor/min/vs/editor/editor.main.css?inline';

/**
 * SafeWrapper component that handles CSS injection for Shadow DOM
*/
const SafeWrapper = () => {
  const containerRef = useRef(null);
  const styleInjectedRef = useRef(false);

  useEffect(() => {
    // Only inject once
    if (styleInjectedRef.current) return;

    const injectStyles = () => {
      try {
        // Find the shadow root by traversing up from our component
        let currentNode = containerRef.current;
        let shadowRoot = null;

        // Traverse up to find shadow root
        while (currentNode) {
          if (currentNode.nodeType === Node.DOCUMENT_FRAGMENT_NODE && currentNode.host) {
            shadowRoot = currentNode;
            break;
          }
          currentNode = currentNode.parentNode || currentNode.host;
        }

        // Fallback: try to find via document query
        if (!shadowRoot) {
          const shadowHost = document.querySelector('json-formatter');
          shadowRoot = shadowHost?.shadowRoot;
        }

        if (!shadowRoot) {
          console.warn('[JSON Formatter] Shadow DOM not found yet');
          return false;
        }

        // Check if styles already exist
        if (shadowRoot.querySelector('#json-formatter-styles')) {
          styleInjectedRef.current = true;
          return true;
        }

        // Inject Monaco CSS first
        const monacoStyleEl = document.createElement('style');
        monacoStyleEl.id = 'monaco-editor-styles';
        monacoStyleEl.textContent = monacoCss;
        shadowRoot.insertBefore(monacoStyleEl, shadowRoot.firstChild);

        // Create style element for our custom CSS
        const styleEl = document.createElement('style');
        styleEl.id = 'json-formatter-styles';
        styleEl.textContent = cssContent;

        // Insert after Monaco CSS
        shadowRoot.insertBefore(styleEl, monacoStyleEl.nextSibling);

        console.log('[JSON Formatter] ✓ Styles injected successfully');
        styleInjectedRef.current = true;
        return true;
      } catch (err) {
        console.error('[JSON Formatter] Failed to inject styles:', err);
        return false;
      }
    };

    // Try immediate injection
    if (!injectStyles()) {
      // Retry with delays if not immediately successful
      const retries = [50, 100, 250, 500, 1000];
      retries.forEach(delay => {
        setTimeout(() => {
          if (!styleInjectedRef.current) {
            injectStyles();
          }
        }, delay);
      });
    }
  }, []);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%' }}>
      {/* Inline style tags as fallback for non-Shadow-DOM scenarios */}
      <style dangerouslySetInnerHTML={{ __html: monacoCss }} />
      <style dangerouslySetInnerHTML={{ __html: cssContent }} />
      <JsonMakePretty />
    </div>
  );
};

export default SafeWrapper;
