import React, { useState, useCallback, useRef } from 'react';
import Editor, { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import './JsonMakePretty.css';
import { prettifyJson } from './tools/jsonTools';
import { useJsonTooltip } from './tools/domUtils';

// Configure @monaco-editor/react to use locally bundled Monaco
// instead of loading from CDN
loader.config({ monaco });

// Initialize Monaco immediately
loader.init().then(() => {
  console.log('[JSON Formatter] Monaco Editor initialized locally');
}).catch((err) => {
  console.error('[JSON Formatter] Monaco initialization failed:', err);
});

const JsonMakePretty = () => {
  const [inputJson, setInputJson] = useState('');
  const [outputJson, setOutputJson] = useState('');
  const [error, setError] = useState('');
  const [indentSpaces, setIndentSpaces] = useState(2);

  const outputEditorContainerRef = useRef(null);
  const {
    tooltip,
    tooltipHandlers,
    handleOutputEditorMount,
    clearTooltip
  } = useJsonTooltip(outputEditorContainerRef);

  const handlePrettify = useCallback((jsonString, spaces = indentSpaces) => {
    const { prettified, error } = prettifyJson(jsonString, spaces);
    setOutputJson(prettified);
    setError(error);
  }, [indentSpaces]);

  const handleInputChange = (value) => {
    setInputJson(value || '');
    handlePrettify(value || '');
  };

  const handleIndentChange = (e) => {
    const value = parseInt(e.target.value);
    setIndentSpaces(value);
    if (inputJson) {
      handlePrettify(inputJson, value);
    }
  };

  const clearAll = () => {
    setInputJson('');
    setOutputJson('');
    setError('');
    clearTooltip();
  };

  return (
    <div className="json-make-pretty">
      <style>{`
        .indent-control {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .btn-clear {
          background-color: #ffffff; 
          color: #475569; 
          border: 1px solid #cbd5e1; 
          border-radius: 6px; 
          padding: 0 14px;
          font-size: 14px;
          font-family: inherit;
          cursor: pointer;
          height: 34px; 
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }
        .btn-clear:hover {
          background-color: #f8fafc;
          border-color: #94a3b8;
        }
        .btn-clear:active {
          background-color: #f1f5f9;
        }
      `}</style>

      <div className="controls-bar">
        <div className="section-label">JSON Input</div>

        <div className="indent-control">
          <label htmlFor="indent-spaces">Indent:</label>
          <select
            id="indent-spaces"
            value={indentSpaces}
            onChange={handleIndentChange}
            className="indent-select"
          >
            <option value={2}>2 spaces</option>
            <option value={4}>4 spaces</option>
            <option value={6}>6 spaces</option>
            <option value={8}>8 spaces</option>
          </select>

          <button onClick={clearAll} className="btn-clear" title="Clear All">
            Clear
          </button>
        </div>

        <div className="section-label">Prettified JSON</div>
      </div>

      <div className="content">
        <div className="input-section">
          <div className="monaco-editor-wrapper">
            <Editor
              height="100%"
              defaultLanguage="json"
              value={inputJson}
              onChange={handleInputChange}
              theme="vs-dark"
              loading={<div style={{ color: '#fff', padding: '20px' }}>Loading editor...</div>}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 2,
                wordWrap: 'off',
                folding: true,
                showFoldingControls: 'always',
                foldingStrategy: 'indentation',
              }}
            />
          </div>
        </div>

        <div className="output-section">
          {error && <div className="error-message">{error}</div>}
          <div
            className="monaco-editor-wrapper"
            ref={outputEditorContainerRef}
          >
            <Editor
              height="100%"
              defaultLanguage="json"
              value={outputJson}
              theme="vs-dark"
              onMount={handleOutputEditorMount}
              loading={<div style={{ color: '#fff', padding: '20px' }}>Loading editor...</div>}
              options={{
                readOnly: true,
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 2,
                wordWrap: 'off',
                domReadOnly: true,
                hover: { enabled: false },
                folding: true,
                showFoldingControls: 'always',
                foldingStrategy: 'indentation',
              }}
            />
            {tooltip.show && (
              <div
                className="path-tooltip"
                style={{
                  position: 'absolute',
                  left: `${tooltip.position.x}px`,
                  top: `${tooltip.position.y}px`,
                  transform: 'translateX(-50%)'
                }}
                onClick={tooltipHandlers.handleCopy}
                onMouseEnter={tooltipHandlers.handleMouseEnter}
                onMouseLeave={tooltipHandlers.handleMouseLeave}
                title="Click to copy"
              >
                {tooltip.path}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default JsonMakePretty;
