import React, { useState, useCallback, useRef, useEffect } from 'react';
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

const MIN_EDITOR_HEIGHT = 180;

const JsonMakePretty = () => {
  const [editorJson, setEditorJson] = useState('');
  const [error, setError] = useState('');
  const [indentSpaces, setIndentSpaces] = useState(2);
  const [editorHeight, setEditorHeight] = useState(MIN_EDITOR_HEIGHT);
  const [validationStatus, setValidationStatus] = useState({ valid: false, message: '' });

  const outputEditorContainerRef = useRef(null);
  const fileInputRef = useRef(null);
  const resizeListenerRef = useRef(null);
  const {
    outputEditorRef,
    tooltip,
    tooltipHandlers,
    handleOutputEditorMount,
    clearTooltip
  } = useJsonTooltip(outputEditorContainerRef);

  const validateJson = useCallback((jsonString) => {
    const trimmed = String(jsonString || '').trim();
    if (!trimmed) {
      return { valid: false, message: '' };
    }

    try {
      JSON.parse(trimmed);
      return { valid: true, message: '✓ Valid JSON' };
    } catch (err) {
      return { valid: false, message: `✗ Invalid JSON: ${err.message}` };
    }
  }, []);

  const formatJson = useCallback((jsonString, spaces = indentSpaces) => {
    return prettifyJson(jsonString, spaces);
  }, [indentSpaces]);

  const handleEditorChange = (value) => {
    const newValue = value || '';
    setEditorJson(newValue);
    setError('');
    setValidationStatus(validateJson(newValue));
  };

  const handleIndentChange = (e) => {
    const value = parseInt(e.target.value, 10);
    setIndentSpaces(value);
  };

  const handleFormat = () => {
    const currentValue = outputEditorRef.current?.getValue() ?? editorJson;
    const trimmedValue = String(currentValue).trim();

    if (!trimmedValue) {
      setError('');
      setEditorJson(currentValue || '');
      setValidationStatus({ valid: false, message: '' });
      return;
    }

    const { prettified, error } = formatJson(currentValue, indentSpaces);
    if (error) {
      setError(error);
      setValidationStatus({ valid: false, message: error });
      return;
    }

    const editor = outputEditorRef.current;
    if (editor) {
      const selection = editor.getSelection();
      editor.pushUndoStop();
      editor.setValue(prettified);
      if (selection) {
        editor.setSelection(selection);
      }
      editor.pushUndoStop();
    }

    setEditorJson(prettified);
    setError('');
    setValidationStatus({ valid: true, message: '✓ Valid JSON' });
  };

  const clearAll = () => {
    setEditorJson('');
    setError('');
    setValidationStatus({ valid: false, message: '' });
    clearTooltip();
  };

  const handleCopyToClipboard = () => {
    const text = editorJson || '';
    navigator.clipboard.writeText(text);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileImport = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      setEditorJson(text);
      setError('');
      setValidationStatus(validateJson(text));
    } catch (readError) {
      setError('Failed to import JSON file.');
      setValidationStatus({ valid: false, message: '✗ Invalid JSON: Failed to read file' });
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDownload = () => {
    const text = editorJson || '';
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'data.json';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    return () => {
      if (resizeListenerRef.current) {
        resizeListenerRef.current.dispose();
        resizeListenerRef.current = null;
      }
    };
  }, []);

  const handleEditorMount = (editor, monacoInstance) => {
    handleOutputEditorMount(editor);

    const updateHeight = (height) => {
      const newHeight = Math.max(height, MIN_EDITOR_HEIGHT);
      setEditorHeight(newHeight);
      window.requestAnimationFrame(() => editor.layout());
    };

    updateHeight(editor.getContentHeight());

    if (resizeListenerRef.current) {
      resizeListenerRef.current.dispose();
    }

    resizeListenerRef.current = editor.onDidContentSizeChange((e) => {
      updateHeight(e.contentHeight);
    });
  };

  return (
    <div className="json-make-pretty">
      <div className="controls-bar">
        <div className="header-left">
          <div className="section-label">JSON Editor</div>
          <div className="toolbar-links">
            <button type="button" className="btn-link" onClick={handleImportClick} title="Import JSON file">
              Import
            </button>
            <button type="button" className="btn-link" onClick={handleDownload} title="Download JSON file">
              Download
            </button>
          </div>
        </div>

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

          <button onClick={handleFormat} className="btn-action btn-primary" title="Format JSON">
            Format
          </button>

          <button onClick={handleCopyToClipboard} className="btn-action btn-secondary" title="Copy editor content">
            Copy
          </button>

          <button onClick={clearAll} className="btn-action btn-secondary" title="Clear Editor">
            Clear
          </button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        style={{ display: 'none' }}
        onChange={handleFileImport}
      />

      <div className="content">
        <div className="editor-section">
          <div className="monaco-editor-wrapper" ref={outputEditorContainerRef}>
            <Editor
              height={`${editorHeight}px`}
              defaultLanguage="json"
              value={editorJson}
              onChange={handleEditorChange}
              theme="vs-dark"
              onMount={handleEditorMount}
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
                scrollbar: {
                  vertical: 'hidden',
                  horizontal: 'auto',
                  alwaysConsumeMouseWheel: false,
                },
              }}
            />
            <div className="editor-status-bar">
              {validationStatus.message ? (
                <span className={`status-badge ${validationStatus.valid ? 'valid' : 'invalid'}`}>
                  {validationStatus.message}
                </span>
              ) : (
                <span className="status-placeholder">JSON status will appear here</span>
              )}
            </div>
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
