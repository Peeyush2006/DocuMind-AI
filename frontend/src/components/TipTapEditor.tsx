import React, { useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Highlight } from '@tiptap/extension-highlight';
import { Table, TableRow, TableHeader, TableCell } from '@tiptap/extension-table';
import {
  Bold,
  Italic,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  RotateCcw,
  RotateCw,
  Table as TableIcon,
  Save,
  CheckCircle2
} from 'lucide-react';

interface TipTapEditorProps {
  initialContent: string;
  onContentChange: (html: string) => void;
  onWordClick?: (wordText: string) => void;
  isSaving?: boolean;
}

export const TipTapEditor: React.FC<TipTapEditorProps> = ({
  initialContent,
  onContentChange,
  onWordClick,
  isSaving = false
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Highlight,
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell
    ],
    content: initialContent || '<p>No content extracted yet.</p>',
    onUpdate: ({ editor }) => {
      onContentChange(editor.getHTML());
    }
  });

  // Update content if initialContent changes externally
  useEffect(() => {
    if (editor && initialContent && editor.getHTML() !== initialContent) {
      editor.commands.setContent(initialContent);
    }
  }, [initialContent, editor]);

  // Click delegation for uncertain OCR spans
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('ocr-uncertain') || target.dataset.wordId) {
        const word = target.dataset.wordId || target.textContent || '';
        if (onWordClick) {
          onWordClick(word);
        }
      }
    };

    el.addEventListener('click', handleClick);
    return () => el.removeEventListener('click', handleClick);
  }, [onWordClick]);

  if (!editor) return null;

  return (
    <div ref={containerRef} className="flex flex-col h-full bg-white">
      {/* Editor Toolbar */}
      <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50/80 px-2 sm:px-3 py-2 text-slate-700">
        <div className="no-scrollbar flex min-w-0 flex-1 flex-nowrap items-center gap-0.5 overflow-x-auto">
          {/* Bold */}
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`rounded p-1.5 hover:bg-slate-200 transition-colors ${
              editor.isActive('bold') ? 'bg-slate-200 text-blue-600 font-bold' : ''
            }`}
            title="Bold (Ctrl+B)"
          >
            <Bold className="h-4 w-4" />
          </button>

          {/* Italic */}
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`rounded p-1.5 hover:bg-slate-200 transition-colors ${
              editor.isActive('italic') ? 'bg-slate-200 text-blue-600 font-bold' : ''
            }`}
            title="Italic (Ctrl+I)"
          >
            <Italic className="h-4 w-4" />
          </button>

          <div className="h-4 w-px bg-slate-300 mx-1" />

          {/* Headings */}
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={`rounded p-1.5 hover:bg-slate-200 transition-colors ${
              editor.isActive('heading', { level: 1 }) ? 'bg-slate-200 text-blue-600' : ''
            }`}
            title="Heading 1"
          >
            <Heading1 className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={`rounded p-1.5 hover:bg-slate-200 transition-colors ${
              editor.isActive('heading', { level: 2 }) ? 'bg-slate-200 text-blue-600' : ''
            }`}
            title="Heading 2"
          >
            <Heading2 className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            className={`rounded p-1.5 hover:bg-slate-200 transition-colors ${
              editor.isActive('heading', { level: 3 }) ? 'bg-slate-200 text-blue-600' : ''
            }`}
            title="Heading 3"
          >
            <Heading3 className="h-4 w-4" />
          </button>

          <div className="h-4 w-px bg-slate-300 mx-1" />

          {/* Lists */}
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`rounded p-1.5 hover:bg-slate-200 transition-colors ${
              editor.isActive('bulletList') ? 'bg-slate-200 text-blue-600' : ''
            }`}
            title="Bullet List"
          >
            <List className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`rounded p-1.5 hover:bg-slate-200 transition-colors ${
              editor.isActive('orderedList') ? 'bg-slate-200 text-blue-600' : ''
            }`}
            title="Numbered List"
          >
            <ListOrdered className="h-4 w-4" />
          </button>

          <div className="h-4 w-px bg-slate-300 mx-1" />

          {/* Insert Table */}
          <button
            type="button"
            onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
            className="rounded p-1.5 hover:bg-slate-200 transition-colors"
            title="Insert Table"
          >
            <TableIcon className="h-4 w-4" />
          </button>

          <div className="h-4 w-px bg-slate-300 mx-1" />

          {/* Undo / Redo */}
          <button
            type="button"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            className="rounded p-1.5 hover:bg-slate-200 disabled:opacity-30 transition-colors"
            title="Undo"
          >
            <RotateCcw className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            className="rounded p-1.5 hover:bg-slate-200 disabled:opacity-30 transition-colors"
            title="Redo"
          >
            <RotateCw className="h-4 w-4" />
          </button>
        </div>

        {/* Autosave Indicator */}
        <div className="flex items-center gap-1.5 text-xs text-slate-400 pr-1">
          {isSaving ? (
            <>
              <div className="h-2 w-2 animate-ping rounded-full bg-blue-500" />
              <span>Autosaving...</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              <span className="hidden sm:inline">Autosaved</span>
            </>
          )}
        </div>
      </div>

      {/* Editor Surface */}
      <div className="flex-1 overflow-y-auto">
        <EditorContent editor={editor} className="h-full" />
      </div>
    </div>
  );
};
