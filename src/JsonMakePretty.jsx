import React, { useState, useRef, useEffect, useCallback } from 'react';
import Editor, { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import './JsonMakePretty.css';

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
  const [selectedPath, setSelectedPath] = useState('');
  const [showPathPopup, setShowPathPopup] = useState(false);
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });
  const [indentSpaces, setIndentSpaces] = useState(2);
  const outputEditorRef = useRef(null);
  const outputEditorContainerRef = useRef(null);
  const hoverTimeoutRef = useRef(null);
  const currentLineRef = useRef(null);
  const isHoveringTooltipRef = useRef(false);
  const mousePositionRef = useRef({ x: 0, y: 0 });
  const showPathPopupRef = useRef(false);

  const prettifyJson = (jsonString, spaces = indentSpaces) => {
    try {
      if (!jsonString.trim()) {
        setOutputJson('');
        setError('');
        return;
      }

      const parsed = JSON.parse(jsonString);
      const prettified = JSON.stringify(parsed, null, spaces);
      setOutputJson(prettified);
      setError('');
    } catch (err) {
      setError('Invalid JSON: ' + err.message);
      setOutputJson('');
    }
  };

  const clearHoverTimeout = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  }, []);

  const hideTooltip = useCallback(() => {
    setTimeout(() => {
      if (!isHoveringTooltipRef.current) {
        setShowPathPopup(false);
        setSelectedPath('');
        currentLineRef.current = null;
      }
    }, 300);
  }, []);

  useEffect(() => {
    return () => {
      clearHoverTimeout();
    };
  }, [clearHoverTimeout]);

  useEffect(() => {
    const container = outputEditorContainerRef.current;
    if (!container) return;

    const handleMouseMove = (e) => {
      const rect = container.getBoundingClientRect();
      mousePositionRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    };

    container.addEventListener('mousemove', handleMouseMove);
    return () => container.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    showPathPopupRef.current = showPathPopup;
  }, [showPathPopup]);

  const handleInputChange = (value) => {
    setInputJson(value || '');
    prettifyJson(value || '');
  };

  const handleIndentChange = (e) => {
    const value = parseInt(e.target.value);
    setIndentSpaces(value);
    if (inputJson) {
      prettifyJson(inputJson, value);
    }
  };

  const clearAll = () => {
    setInputJson('');
    setOutputJson('');
    setError('');
    setShowPathPopup(false);
    setSelectedPath('');
    clearHoverTimeout();
  };

  const copyPathToClipboard = useCallback(() => {
    if (selectedPath) {
      navigator.clipboard.writeText(selectedPath);
    }
  }, [selectedPath]);

  const getJsonPath = (lines, lineIndex) => {
    const stack = [];
    let arrayIndices = {};

    for (let i = 0; i <= lineIndex; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();

      if (!trimmedLine) {
        continue;
      }

      const indent = line.search(/\S/);

      while (stack.length > 0 && indent <= stack[stack.length - 1].indent) {
        const popped = stack.pop();
        if (popped.arrayIndent !== undefined) {
          delete arrayIndices[popped.arrayIndent];
        }
      }

      if (trimmedLine === '[') {
        if (stack.length > 0 && !stack[stack.length - 1].opensArray) {
          stack[stack.length - 1].opensArray = true;
          stack[stack.length - 1].arrayIndent = indent;
          arrayIndices[indent] = -1;
        }
        continue;
      }

      if (trimmedLine === '{') {
        for (let j = stack.length - 1; j >= 0; j--) {
          if (stack[j].opensArray && stack[j].arrayIndent < indent) {
            arrayIndices[stack[j].arrayIndent]++;
            stack.push({
              type: 'arrayElement',
              indent: indent,
              arrayIndex: arrayIndices[stack[j].arrayIndent],
              parentKey: stack[j].key
            });
            break;
          }
        }
        continue;
      }

      if (trimmedLine === '}' || trimmedLine === '},' || trimmedLine === '],') {
        continue;
      }

      const keyMatch = trimmedLine.match(/^"([^"]+)"\s*:\s*(.*)$/);
      if (keyMatch) {
        const key = keyMatch[1];
        const valueStart = keyMatch[2].trim();

        const opensArrayNow = valueStart === '[' || valueStart.startsWith('[');

        stack.push({
          key,
          indent,
          type: 'key',
          opensArray: opensArrayNow,
          arrayIndent: opensArrayNow ? indent : undefined
        });

        if (opensArrayNow) {
          arrayIndices[indent] = -1;
        }
      }
    }

    let path = [];

    for (let i = 0; i < stack.length; i++) {
      const item = stack[i];

      if (item.type === 'arrayElement') {
        if (item.parentKey) {
          if (path.length > 0 && path[path.length - 1].startsWith(item.parentKey)) {
            path.pop();
          }
          path.push(`${item.parentKey}[${item.arrayIndex}]`);
        }
      } else if (item.type === 'key') {
        path.push(item.key);
      }
    }

    return path.join('.');
  };

  const handleTooltipMouseEnter = useCallback(() => {
    isHoveringTooltipRef.current = true;
  }, []);

  const handleTooltipMouseLeave = useCallback(() => {
    isHoveringTooltipRef.current = false;
    hideTooltip();
  }, [hideTooltip]);

  const handleOutputEditorMount = (editor) => {
    outputEditorRef.current = editor;

    editor.onMouseMove((e) => {
      const position = e.target.position;

      if (isHoveringTooltipRef.current) {
        return;
      }

      if (!position || e.target.type !== 6) {
        clearHoverTimeout();
        if (!showPathPopupRef.current) {
          hideTooltip();
        }
        return;
      }

      const lineIndex = position.lineNumber - 1;

      if (currentLineRef.current === lineIndex && hoverTimeoutRef.current) {
        return;
      }

      clearHoverTimeout();

      if (currentLineRef.current !== lineIndex && showPathPopupRef.current && !isHoveringTooltipRef.current) {
        hideTooltip();
      }

      currentLineRef.current = lineIndex;

      const model = editor.getModel();
      if (!model) {
        return;
      }

      const content = model.getValue();
      const lines = content.split('\n');

      if (lineIndex >= lines.length || lineIndex < 0) {
        return;
      }

      hoverTimeoutRef.current = setTimeout(() => {
        const path = getJsonPath(lines, lineIndex);

        if (path) {
          setSelectedPath(path);
          setShowPathPopup(true);
          setPopupPosition({
            x: mousePositionRef.current.x,
            y: mousePositionRef.current.y + 20
          });
        }
      }, 1000);
    });

    editor.onDidScrollChange(() => {
      clearHoverTimeout();
      setShowPathPopup(false);
      currentLineRef.current = null;
    });

    editor.onDidChangeModelContent(() => {
      clearHoverTimeout();
      setShowPathPopup(false);
      currentLineRef.current = null;
    });
  };

  return (
    <div className="json-make-pretty">
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
        </div>
        <div className="section-label">Prettified JSON</div>
      </div>

      <button onClick={clearAll} className="btn-clear-floating" title="Clear All">
        ×
      </button>

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
            {showPathPopup && (
              <div
                className="path-tooltip"
                style={{
                  position: 'absolute',
                  left: `${popupPosition.x}px`,
                  top: `${popupPosition.y}px`,
                  transform: 'translateX(-50%)'
                }}
                onClick={copyPathToClipboard}
                onMouseEnter={handleTooltipMouseEnter}
                onMouseLeave={handleTooltipMouseLeave}
                title="Click to copy"
              >
                {selectedPath}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default JsonMakePretty;
