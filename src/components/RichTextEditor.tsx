import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Link as LinkIcon,
  Eraser,
} from 'lucide-react';
import { countReadableChars, sanitizeRichText } from '../utils/richText';
import { useAlert } from '../context/AlertContext';
import './RichTextEditor.css';

export interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  disabled?: boolean;
  maxChars?: number;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  label = 'Content',
  disabled = false,
  maxChars,
}) => {
  const alert = useAlert();
  const editorRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const lastValidHtmlRef = useRef<string>(value || '');
  const savedRangeRef = useRef<Range | null>(null);

  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    underline: false,
    strikeThrough: false,
    justifyLeft: false,
    justifyCenter: false,
    justifyRight: false,
    justifyFull: false,
    insertUnorderedList: false,
    insertOrderedList: false,
  });

  const charCount = countReadableChars(value);
  const isOverLimit = maxChars !== undefined && charCount > maxChars;
  const isLimitReached = maxChars !== undefined && charCount >= maxChars;

  // Track active formats and save current selection range
  const updateActiveFormats = useCallback(() => {
    if (!editorRef.current) return;
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && editorRef.current.contains(sel.anchorNode)) {
      savedRangeRef.current = sel.getRangeAt(0).cloneRange();

      try {
        setActiveFormats({
          bold: document.queryCommandState('bold'),
          italic: document.queryCommandState('italic'),
          underline: document.queryCommandState('underline'),
          strikeThrough: document.queryCommandState('strikeThrough'),
          justifyLeft: document.queryCommandState('justifyLeft'),
          justifyCenter: document.queryCommandState('justifyCenter'),
          justifyRight: document.queryCommandState('justifyRight'),
          justifyFull: document.queryCommandState('justifyFull'),
          insertUnorderedList: document.queryCommandState('insertUnorderedList'),
          insertOrderedList: document.queryCommandState('insertOrderedList'),
        });
      } catch {
        // Query state not supported in some older environments
      }
    }
  }, []);

  // Sync incoming value to contentEditable div only when NOT actively being focused/edited by the user
  useEffect(() => {
    if (editorRef.current) {
      const isEditorActive =
        document.activeElement === editorRef.current ||
        editorRef.current.contains(document.activeElement);

      if (!isEditorActive) {
        const currentHTML = editorRef.current.innerHTML;
        if (currentHTML !== value) {
          editorRef.current.innerHTML = value || '';
        }
      }
    }
    if (maxChars === undefined || countReadableChars(value) <= maxChars) {
      lastValidHtmlRef.current = value || '';
    }
  }, [value, maxChars]);

  const handleInput = () => {
    if (editorRef.current) {
      const rawHTML = editorRef.current.innerHTML;
      const currentChars = countReadableChars(rawHTML);

      // Strict enforcement: if user added characters exceeding maxChars, revert to last valid state
      if (maxChars !== undefined && currentChars > maxChars) {
        editorRef.current.innerHTML = lastValidHtmlRef.current;

        // Move cursor to end of text
        try {
          const range = document.createRange();
          const sel = window.getSelection();
          range.selectNodeContents(editorRef.current);
          range.collapse(false);
          sel?.removeAllRanges();
          sel?.addRange(range);
        } catch {
          // Ignore range collapse errors in test environments
        }

        onChange(lastValidHtmlRef.current);
        return;
      }

      const sanitized = sanitizeRichText(rawHTML);
      lastValidHtmlRef.current = sanitized;
      onChange(sanitized);
      updateActiveFormats();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;

    // Keys that do not add characters: navigation, deletion, shortcuts
    const nonCharKeys = [
      'Backspace',
      'Delete',
      'ArrowLeft',
      'ArrowRight',
      'ArrowUp',
      'ArrowDown',
      'Home',
      'End',
      'PageUp',
      'PageDown',
      'Tab',
      'Escape',
    ];

    if (nonCharKeys.includes(e.key) || e.ctrlKey || e.metaKey || e.altKey) {
      return;
    }

    if (maxChars !== undefined) {
      // If text is currently selected, typing will replace that selected text
      const selection = window.getSelection();
      const selectedLength = selection ? selection.toString().length : 0;
      const currentChars = countReadableChars(editorRef.current?.innerHTML || '');
      const effectiveChars = currentChars - selectedLength;

      if (effectiveChars >= maxChars) {
        // Strict enforcement: block any additional character or newline
        if (e.key.length === 1 || e.key === 'Enter') {
          e.preventDefault();
          return;
        }
      }
    }
  };

  const handleBeforeInput = (e: any) => {
    if (disabled || maxChars === undefined) return;
    if (e.inputType?.startsWith('delete')) return;

    const selection = window.getSelection();
    const selectedLength = selection ? selection.toString().length : 0;
    const currentChars = countReadableChars(editorRef.current?.innerHTML || '');
    const incomingLength = e.data ? e.data.length : 1;

    if (currentChars - selectedLength + incomingLength > maxChars) {
      e.preventDefault();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    e.preventDefault();
    const pasteText = e.clipboardData.getData('text/plain');
    if (!pasteText) return;

    if (maxChars !== undefined) {
      const selection = window.getSelection();
      const selectedText = selection ? selection.toString() : '';
      const selectedLength = selectedText.length;
      const currentChars = countReadableChars(editorRef.current?.innerHTML || '');
      const effectiveChars = Math.max(0, currentChars - selectedLength);
      const remainingSlots = maxChars - effectiveChars;

      if (remainingSlots <= 0) {
        return; // Character limit reached; strictly block pasting more characters
      }

      const textToInsert = pasteText.slice(0, remainingSlots);
      document.execCommand('insertText', false, textToInsert);
      handleInput();
    } else {
      document.execCommand('insertText', false, pasteText);
      handleInput();
    }
  };

  const execCmd = (command: string, arg: string | undefined = undefined) => {
    if (disabled || !editorRef.current) return;

    // 1. Maintain focus in editor
    editorRef.current.focus();

    // 2. Restore saved range if selection was lost
    const sel = window.getSelection();
    if (savedRangeRef.current) {
      if (!sel || sel.rangeCount === 0 || !editorRef.current.contains(sel.anchorNode)) {
        sel?.removeAllRanges();
        sel?.addRange(savedRangeRef.current);
      }
    }

    // 3. Execute formatting command cleanly on current active selection
    document.execCommand(command, false, arg);

    // 4. Update the saved range after formatting
    if (sel && sel.rangeCount > 0 && editorRef.current.contains(sel.anchorNode)) {
      savedRangeRef.current = sel.getRangeAt(0).cloneRange();
    }

    // 5. Update state and trigger input handler
    updateActiveFormats();
    handleInput();
  };

  const handleAddLink = () => {
    if (disabled) return;
    const url = prompt('Enter link URL (e.g. https://example.com):');
    if (url) {
      const cleanUrl = url.trim();
      if (!cleanUrl.toLowerCase().startsWith('javascript:')) {
        execCmd('createLink', cleanUrl);
      } else {
        alert.error('Invalid or unsafe link URL.');
      }
    }
  };

  const handleClearFormat = () => {
    execCmd('removeFormat');
  };

  return (
    <div className="rte-container">
      {/* Label and Live Counter Header */}
      <div className="rte-header">
        <label className="admin-form-label" style={{ marginBottom: 0 }}>
          {label}
        </label>
        {maxChars !== undefined ? (
          <div
            className={`rte-word-counter ${isOverLimit ? 'over-limit' : ''} ${
              isLimitReached ? 'limit-reached' : ''
            }`}
            style={
              isLimitReached
                ? { borderColor: '#E65100', color: '#E65100', background: '#FFF3E0' }
                : undefined
            }
          >
            <span className="font-mono">{charCount}</span> / {maxChars} characters{' '}
            {isLimitReached ? '• Limit reached' : ''}
          </div>
        ) : (
          <div className="rte-word-counter">
            <span className="font-mono">{charCount}</span> characters
          </div>
        )}
      </div>

      {/* Editor Box */}
      <div className={`rte-box ${isFocused ? 'focused' : ''} ${isOverLimit ? 'error' : ''}`}>
        {/* Toolbar */}
        <div className="rte-toolbar">
          {/* Bold */}
          <button
            type="button"
            className={`rte-btn ${activeFormats.bold ? 'active' : ''}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => execCmd('bold')}
            disabled={disabled}
            title="Bold"
          >
            <Bold size={15} />
          </button>

          {/* Italic */}
          <button
            type="button"
            className={`rte-btn ${activeFormats.italic ? 'active' : ''}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => execCmd('italic')}
            disabled={disabled}
            title="Italic"
          >
            <Italic size={15} />
          </button>

          {/* Underline */}
          <button
            type="button"
            className={`rte-btn ${activeFormats.underline ? 'active' : ''}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => execCmd('underline')}
            disabled={disabled}
            title="Underline"
          >
            <Underline size={15} />
          </button>

          {/* Strikethrough */}
          <button
            type="button"
            className={`rte-btn ${activeFormats.strikeThrough ? 'active' : ''}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => execCmd('strikeThrough')}
            disabled={disabled}
            title="Strikethrough"
          >
            <Strikethrough size={15} />
          </button>

          <div className="rte-divider" />

          {/* Bulleted List */}
          <button
            type="button"
            className={`rte-btn ${activeFormats.insertUnorderedList ? 'active' : ''}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => execCmd('insertUnorderedList')}
            disabled={disabled}
            title="Bulleted List"
          >
            <List size={15} />
          </button>

          {/* Numbered List */}
          <button
            type="button"
            className={`rte-btn ${activeFormats.insertOrderedList ? 'active' : ''}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => execCmd('insertOrderedList')}
            disabled={disabled}
            title="Numbered List"
          >
            <ListOrdered size={15} />
          </button>

          <div className="rte-divider" />

          {/* Align Left */}
          <button
            type="button"
            className={`rte-btn ${activeFormats.justifyLeft ? 'active' : ''}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => execCmd('justifyLeft')}
            disabled={disabled}
            title="Align Left"
          >
            <AlignLeft size={15} />
          </button>

          {/* Align Center */}
          <button
            type="button"
            className={`rte-btn ${activeFormats.justifyCenter ? 'active' : ''}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => execCmd('justifyCenter')}
            disabled={disabled}
            title="Align Center"
          >
            <AlignCenter size={15} />
          </button>

          {/* Align Right */}
          <button
            type="button"
            className={`rte-btn ${activeFormats.justifyRight ? 'active' : ''}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => execCmd('justifyRight')}
            disabled={disabled}
            title="Align Right"
          >
            <AlignRight size={15} />
          </button>

          {/* Justify */}
          <button
            type="button"
            className={`rte-btn ${activeFormats.justifyFull ? 'active' : ''}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => execCmd('justifyFull')}
            disabled={disabled}
            title="Justify"
          >
            <AlignJustify size={15} />
          </button>

          <div className="rte-divider" />

          {/* Link */}
          <button
            type="button"
            className="rte-btn"
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleAddLink}
            disabled={disabled}
            title="Add Link"
          >
            <LinkIcon size={15} />
          </button>

          {/* Clear Formatting */}
          <button
            type="button"
            className="rte-btn"
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleClearFormat}
            disabled={disabled}
            title="Clear Formatting"
          >
            <Eraser size={15} />
          </button>
        </div>

        {/* ContentEditable Canvas */}
        <div
          ref={editorRef}
          className="rte-content"
          contentEditable={!disabled}
          onInput={handleInput}
          onBeforeInput={handleBeforeInput}
          onKeyDown={handleKeyDown}
          onKeyUp={updateActiveFormats}
          onMouseUp={updateActiveFormats}
          onSelect={updateActiveFormats}
          onPaste={handlePaste}
          onFocus={() => {
            setIsFocused(true);
            updateActiveFormats();
          }}
          onBlur={() => {
            setIsFocused(false);
            if (editorRef.current) {
              const sanitized = sanitizeRichText(editorRef.current.innerHTML);
              if (editorRef.current.innerHTML !== sanitized) {
                editorRef.current.innerHTML = sanitized;
              }
            }
          }}
          suppressContentEditableWarning
        />
      </div>

      {isOverLimit && maxChars !== undefined && (
        <p className="rte-error-msg">
          ⚠️ {label} exceeds maximum limit of {maxChars} characters ({charCount} characters entered). Please
          shorten it before saving.
        </p>
      )}
    </div>
  );
};
