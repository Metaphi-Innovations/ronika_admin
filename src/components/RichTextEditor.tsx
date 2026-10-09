import React, { useEffect, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { Slice, Fragment, Node as ProseMirrorNode } from '@tiptap/pm/model';
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
}

import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';

// Custom Strict Character Limit Extension
const StrictCharacterLimit = Extension.create({
  name: 'strictCharacterLimit',
  addOptions() {
    return { limit: null };
  },
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('strictCharacterLimit'),
        filterTransaction: (transaction, state) => {
          const limit = this.options.limit;
          if (limit === null || limit === undefined) return true;
          if (!transaction.docChanged) return true;

          // If this is a paste, we allow the transaction through because 
          // transformPasted will have already truncated it to exactly fit the limit!
          if (transaction.getMeta('paste')) return true;

          const length = transaction.doc.textBetween(0, transaction.doc.content.size, '\n').length;
          if (length > limit) {
            return false;
          }
          return true;
        },
      }),
    ];
  },
});

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  label = 'Content',
  disabled = false,
  maxChars,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [, forceUpdate] = useState({});

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
      ...(maxChars ? [StrictCharacterLimit.configure({ limit: maxChars })] : [])
    ],
    content: sanitizeRichText(value),
    editable: !disabled,
    editorProps: {
      transformPasted: (slice, view) => {
        if (maxChars === undefined) return slice;
        
        const currentLength = view.state.doc.textBetween(0, view.state.doc.content.size, '\n').length;
        const selectionLength = view.state.doc.textBetween(view.state.selection.from, view.state.selection.to, '\n').length;
        
        const available = maxChars - (currentLength - selectionLength);
        if (available <= 0) {
          return new Slice(Fragment.empty, 0, 0);
        }

        const capacity = { remaining: available };
        let didTruncate = false;

        function truncateFragment(fragment: Fragment): Fragment {
          const nodes: ProseMirrorNode[] = [];
          
          for (let i = 0; i < fragment.childCount; i++) {
            const child = fragment.child(i);
            
            if (capacity.remaining <= 0) {
              didTruncate = true;
              break;
            }

            if (child.isText) {
              const text = child.text || '';
              if (text.length <= capacity.remaining) {
                nodes.push(child);
                capacity.remaining -= text.length;
              } else {
                nodes.push(child.type.schema.text(text.substring(0, capacity.remaining), child.marks));
                capacity.remaining = 0;
                didTruncate = true;
              }
            } else if (child.isBlock) {
              if (nodes.length > 0) {
                if (capacity.remaining <= 0) {
                  didTruncate = true;
                  break;
                }
                capacity.remaining -= 1;
              }
              const truncatedContent = truncateFragment(child.content);
              nodes.push(child.copy(truncatedContent));
            } else {
              if (child.type.name === 'hardBreak') {
                if (capacity.remaining > 0) {
                  nodes.push(child);
                  capacity.remaining -= 1;
                } else {
                  didTruncate = true;
                }
              } else {
                nodes.push(child);
              }
            }
          }
          return Fragment.from(nodes);
        }

        const truncated = truncateFragment(slice.content);

        if (!didTruncate) {
          return slice;
        }

        let maxOpenEnd = 0;
        let n = truncated.lastChild;
        while (n && !n.isText && n.content.childCount > 0) {
          maxOpenEnd++;
          n = n.lastChild;
        }
        
        return new Slice(truncated, slice.openStart, Math.min(slice.openEnd, maxOpenEnd));
      }
    },
    onUpdate: ({ editor }) => {
      let rawHTML = editor.getHTML();
      if (rawHTML === '<p></p>') {
        rawHTML = '';
      }
      const sanitized = sanitizeRichText(rawHTML);
      onChange(sanitized);
    },
    onFocus: () => setIsFocused(true),
    onBlur: () => setIsFocused(false),
    onTransaction: () => forceUpdate({}),
  });

  // Use the exact same calculation as the limit enforcement if the editor is mounted.
  // This guarantees the counter perfectly matches the enforcement logic.
  const charCount = (editor && !editor.isDestroyed) 
    ? editor.state.doc.textBetween(0, editor.state.doc.content.size, '\n').length 
    : countReadableChars(value);
    
  const isOverLimit = maxChars !== undefined && charCount > maxChars;
  const isLimitReached = maxChars !== undefined && charCount >= maxChars;

  useEffect(() => {
    if (editor && !editor.isDestroyed) {
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
    if (editor && !editor.isDestroyed) {
      editor.setEditable(!disabled);
    }
  }, [disabled, editor]);


  if (!editor) {
    return null;
  }

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
        <div>
          <EditorContent editor={editor} className="rte-content tiptap-content" />
        </div>
      </div>
    </div>
  );
};
