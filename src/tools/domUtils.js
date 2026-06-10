import { useState, useRef, useCallback, useEffect } from 'react';
import { getJsonPath } from './jsonTools';

/**
 * Custom hook to manage the JSON path tooltip logic.
 * @param {React.RefObject<HTMLDivElement>} outputEditorContainerRef - Ref to the output editor container.
 * @returns {{
 *   outputEditorRef: React.RefObject<any>,
 *   tooltip: {
 *     show: boolean,
 *     path: string,
 *     position: { x: number, y: number }
 *   },
 *   tooltipHandlers: {
 *     handleCopy: () => void,
 *     handleMouseEnter: () => void,
 *     handleMouseLeave: () => void
 *   },
 *   handleOutputEditorMount: (editor: any) => void,
 *   clearTooltip: () => void
 * }}
 */
export const useJsonTooltip = (outputEditorContainerRef) => {
    const [selectedPath, setSelectedPath] = useState('');
    const [showPathPopup, setShowPathPopup] = useState(false);
    const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });

    const outputEditorRef = useRef(null);
    const hoverTimeoutRef = useRef(null);
    const currentLineRef = useRef(null);
    const isHoveringTooltipRef = useRef(false);
    const mousePositionRef = useRef({ x: 0, y: 0 });
    const showPathPopupRef = useRef(false);

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

    const clearTooltip = useCallback(() => {
        setShowPathPopup(false);
        setSelectedPath('');
        clearHoverTimeout();
    }, [clearHoverTimeout]);

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
                y: e.clientY - rect.top,
            };
        };

        container.addEventListener('mousemove', handleMouseMove);
        return () => container.removeEventListener('mousemove', handleMouseMove);
    }, [outputEditorContainerRef]);

    useEffect(() => {
        showPathPopupRef.current = showPathPopup;
    }, [showPathPopup]);

    const copyPathToClipboard = useCallback(() => {
        if (selectedPath) {
            navigator.clipboard.writeText(selectedPath);
        }
    }, [selectedPath]);

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
                const columnNumber = position.column; 
                const path = getJsonPath(content, position.lineNumber, columnNumber);

                if (path) {
                    setSelectedPath(path);
                    setShowPathPopup(true);
                    setPopupPosition({
                        x: mousePositionRef.current.x,
                        y: mousePositionRef.current.y + 20,
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

    return {
        outputEditorRef,
        tooltip: {
            show: showPathPopup,
            path: selectedPath,
            position: popupPosition,
        },
        tooltipHandlers: {
            handleCopy: copyPathToClipboard,
            handleMouseEnter: handleTooltipMouseEnter,
            handleMouseLeave: handleTooltipMouseLeave,
        },
        handleOutputEditorMount,
        clearTooltip,
    };
};
