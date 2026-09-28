import React, { useEffect, useRef, useState } from 'react';
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
import { countReadableWords, sanitizeRichText, MAX_HERO_QUOTE_WORDS } from '../utils/richText';
import { useAlert } from '../context/AlertContext';
import './RichTextEditor.css';

export interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  disabled?: boolean;
  maxWords?: number;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  label = 'Hero Quote',
  disabled = false,
  maxWords = MAX_HERO_QUOTE_WORDS,
}) => {
  const alert = useAlert();
  const editorRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const lastValidHtmlRef = useRef<string>(value || '');

  const wordCount = countReadableWords(value);
  const isOverLimit = wordCount > maxWords;
  const isLimitReached = wordCount >= maxWords;

  // Sync incoming value to contentEditable div if changed externally
  useEffect(() => {
    if (editorRef.current) {
      const currentHTML = editorRef.current.innerHTML;
      if (currentHTML !== value) {
        editorRef.current.innerHTML = value || '';
      }
    }
    if (countReadableWords(value) <= maxWords) {
      lastValidHtmlRef.current = value || '';
    }
  }, [value, maxWords]);

  const handleInput = () => {
    if (editorRef.current) {
      const rawHTML = editorRef.current.innerHTML;
      const currentWords = countReadableWords(rawHTML);

      // Strict enforcement: if user somehow added words exceeding maxWords, revert to last valid state
      if (currentWords > maxWords) {
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
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;

    // Keys that do not add words: navigation, deletion, shortcuts
    const nonWordKeys = [
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

    if (nonWordKeys.includes(e.key) || e.ctrlKey || e.metaKey || e.altKey) {
      return;
    }

    // If text is currently selected, typing will replace that selected text, so allow it initially
    const selection = window.getSelection();
    if (selection && selection.toString().trim().length > 0) {
      return;
    }

    const currentWords = countReadableWords(editorRef.current?.innerHTML || '');
    if (currentWords >= maxWords) {
      // User is already at or above word limit:
      // Block Space or Enter to strictly prevent starting a next word
      if (e.key === ' ' || e.key === 'Spacebar' || e.key === 'Enter') {
        e.preventDefault();
        return;
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    e.preventDefault();
    const pasteText = e.clipboardData.getData('text/plain');
    if (!pasteText) return;

    // Calculate remaining allowed word slots
    const selection = window.getSelection();
    const selectedText = selection ? selection.toString() : '';
    const selectedWordCount = countReadableWords(selectedText);
    const currentWords = countReadableWords(editorRef.current?.innerHTML || '');
    const effectiveWords = Math.max(0, currentWords - selectedWordCount);
    const remainingSlots = maxWords - effectiveWords;

    if (remainingSlots <= 0) {
      return; // Word limit reached; block pasting more words
    }

    const pasteWords = pasteText.trim().split(/\s+/).filter(Boolean);
    const textToInsert = pasteWords.slice(0, remainingSlots).join(' ');

    document.execCommand('insertText', false, textToInsert);
    handleInput();
  };

  const execCmd = (command: string, arg: string | undefined = undefined) => {
    if (disabled) return;
    document.execCommand(command, false, arg);
    if (editorRef.current) {
      editorRef.current.focus();
      handleInput();
    }
  };

  const handleBlockFormat = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === 'p' || val === 'h3') {
      execCmd('formatBlock', `<${val}>`);
    }
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
    execCmd('formatBlock', '<p>');
  };

  return (
    <div className="rte-container">
      {/* Label and Live Counter Header */}
      <div className="rte-header">
        <label className="admin-form-label" style={{ marginBottom: 0 }}>
          {label}
        </label>
        <div className={`rte-word-counter ${isOverLimit ? 'over-limit' : ''} ${isLimitReached ? 'limit-reached' : ''}`} style={isLimitReached ? { borderColor: '#E65100', color: '#E65100', background: '#FFF3E0' } : undefined}>
          <span className="font-mono">{wordCount}</span> / {maxWords} words {isLimitReached ? '• Limit reached' : ''}
        </div>
      </div>

      {/* Editor Box */}
      <div className={`rte-box ${isFocused ? 'focused' : ''} ${isOverLimit ? 'error' : ''}`}>
        {/* Toolbar */}
        <div className="rte-toolbar">
          <select
            className="rte-select"
            onChange={handleBlockFormat}
            defaultValue="p"
            disabled={disabled}
            title="Paragraph / Heading Style"
          >
            <option value="p">Paragraph</option>
            <option value="h3">Heading</option>
          </select>

          <div className="rte-divider" />

          <button
            type="button"
            className="rte-btn"
            onClick={() => execCmd('bold')}
            disabled={disabled}
            title="Bold"
          >
            <Bold size={15} />
          </button>
          <button
            type="button"
            className="rte-btn"
            onClick={() => execCmd('italic')}
            disabled={disabled}
            title="Italic"
          >
            <Italic size={15} />
          </button>
          <button
            type="button"
            className="rte-btn"
            onClick={() => execCmd('underline')}
            disabled={disabled}
            title="Underline"
          >
            <Underline size={15} />
          </button>
          <button
            type="button"
            className="rte-btn"
            onClick={() => execCmd('strikeThrough')}
            disabled={disabled}
            title="Strikethrough"
          >
            <Strikethrough size={15} />
          </button>

          <div className="rte-divider" />

          <button
            type="button"
            className="rte-btn"
            onClick={() => execCmd('insertUnorderedList')}
            disabled={disabled}
            title="Bulleted List"
          >
            <List size={15} />
          </button>
          <button
            type="button"
            className="rte-btn"
            onClick={() => execCmd('insertOrderedList')}
            disabled={disabled}
            title="Numbered List"
          >
            <ListOrdered size={15} />
          </button>

          <div className="rte-divider" />

          <button
            type="button"
            className="rte-btn"
            onClick={() => execCmd('justifyLeft')}
            disabled={disabled}
            title="Align Left"
          >
            <AlignLeft size={15} />
          </button>
          <button
            type="button"
            className="rte-btn"
            onClick={() => execCmd('justifyCenter')}
            disabled={disabled}
            title="Align Center"
          >
            <AlignCenter size={15} />
          </button>
          <button
            type="button"
            className="rte-btn"
            onClick={() => execCmd('justifyRight')}
            disabled={disabled}
            title="Align Right"
          >
            <AlignRight size={15} />
          </button>
          <button
            type="button"
            className="rte-btn"
            onClick={() => execCmd('justifyFull')}
            disabled={disabled}
            title="Justify"
          >
            <AlignJustify size={15} />
          </button>

          <div className="rte-divider" />

          <button
            type="button"
            className="rte-btn"
            onClick={handleAddLink}
            disabled={disabled}
            title="Add Link"
          >
            <LinkIcon size={15} />
          </button>
          <button
            type="button"
            className="rte-btn"
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
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          suppressContentEditableWarning
        />
      </div>

      {isOverLimit && (
        <p className="rte-error-msg">
          ⚠️ {label} exceeds maximum limit of {maxWords} words ({wordCount} words entered). Please shorten it before saving.
        </p>
      )}
    </div>
  );
};
