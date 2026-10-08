import React, { useEffect, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import UnderlineExtension from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import LinkExtension from '@tiptap/extension-link';
import CharacterCount from '@tiptap/extension-character-count';
import {
  Bold,
  Italic,
  Underline,
} from 'lucide-react';
import { countReadableChars, sanitizeRichText } from '../utils/richText';
import './RichTextEditor.css';

export interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  disabled?: boolean;
  maxChars?: number;
  small?: boolean;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  label = 'Content',
  disabled = false,
  maxChars,
  small = false,
}) => {
  const [isFocused, setIsFocused] = useState(false);

  const charCount = countReadableChars(value);
  const isOverLimit = maxChars !== undefined && charCount > maxChars;
  const isLimitReached = maxChars !== undefined && charCount >= maxChars;

  const editor = useEditor({
    extensions: [
      StarterKit,
      UnderlineExtension,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      LinkExtension.configure({
        openOnClick: false,
      }),
      ...(maxChars ? [CharacterCount.configure({ limit: maxChars })] : [])
    ],
    content: sanitizeRichText(value),
    editable: !disabled,
    onUpdate: ({ editor }) => {
      let rawHTML = editor.getHTML();
      // Only keep the <p></p> tags if there's actual content. Empty tiptap usually gives <p></p>
      if (rawHTML === '<p></p>') {
        rawHTML = '';
      }
      const sanitized = sanitizeRichText(rawHTML);
      onChange(sanitized);
    },
    onFocus: () => setIsFocused(true),
    onBlur: () => setIsFocused(false),
    editorProps: {
      handleKeyDown: (view, event) => {
        if (maxChars !== undefined) {
          // Use Tiptap's internal text length which perfectly matches our updated visual counter
          const currentChars = view.state.doc.textContent.length;
          
          // Allow keys that reduce text or navigate
          const allowedKeys = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Tab'];
          
          // If limit is reached, and no text is selected (meaning it's a pure insertion)
          if (currentChars >= maxChars && view.state.selection.empty) {
            // Block if it's not an allowed key and not a shortcut (Ctrl/Cmd)
            if (!allowedKeys.includes(event.key) && !event.ctrlKey && !event.metaKey) {
              event.preventDefault();
              return true; // Strictly block Enter, Space, and all characters
            }
          }
        }
        return false;
      }
    }
  });

  useEffect(() => {
    if (editor) {
      const currentHTML = editor.getHTML();
      // Ensure we compare the exact sanitized format that is emitted to parent
      const sanitizedCurrent = sanitizeRichText(currentHTML === '<p></p>' ? '' : currentHTML);
      const isValueEmpty = value === '<p></p>' || value === '';
      const isSanitizedEmpty = sanitizedCurrent === '';
      
      if (sanitizedCurrent !== value && !(isSanitizedEmpty && isValueEmpty)) {
        // Only set content if it's an external change that differs from our current state
        editor.commands.setContent(sanitizeRichText(value), { emitUpdate: false });
      }
    }
  }, [value, editor]);

  useEffect(() => {
    if (editor) {
      editor.setEditable(!disabled);
    }
  }, [disabled, editor]);


  if (!editor) {
    return null;
  }

  return (
    <div className={`rte-container ${small ? 'is-small' : ''}`} style={small ? { height: 'fit-content', flex: 'none' } : {}}>
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
      <div 
        className={`rte-box ${isFocused ? 'focused' : ''} ${isOverLimit ? 'error' : ''}`}
        style={small ? { height: 'fit-content', flex: 'none' } : {}}
      >
        {/* Toolbar */}
        <div className="rte-toolbar">
          {/* Bold */}
          <button
            type="button"
            className={`rte-btn ${editor.isActive('bold') ? 'active' : ''}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().toggleBold().run()}
            disabled={disabled}
            title="Bold"
          >
            <Bold size={15} />
          </button>

          {/* Italic */}
          <button
            type="button"
            className={`rte-btn ${editor.isActive('italic') ? 'active' : ''}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            disabled={disabled}
            title="Italic"
          >
            <Italic size={15} />
          </button>

          {/* Underline */}
          <button
            type="button"
            className={`rte-btn ${editor.isActive('underline') ? 'active' : ''}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            disabled={disabled}
            title="Underline"
          >
            <Underline size={15} />
          </button>


        </div>

        {/* ContentEditable Canvas - Tiptap wraps it automatically */}
        <div style={small ? { minHeight: '42px' } : {}}>
          <EditorContent editor={editor} className={`rte-content tiptap-content ${small ? 'small-editor' : ''}`} />
        </div>
      </div>
    </div>
  );
};
