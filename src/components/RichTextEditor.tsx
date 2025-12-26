/**
 * Rich Text Editor Component
 * WYSIWYG editor with formatting toolbar
 */

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { cn } from '@/utils/cn';
import {
  Bold, Italic, Underline, Strikethrough, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, Link, Image, Code, Quote, Undo, Redo, Type, Heading1, Heading2, Heading3
} from 'lucide-react';

export interface RichTextEditorProps {
  value?: string;
  onChange?: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
  maxHeight?: number;
  readOnly?: boolean;
  autoFocus?: boolean;
  showToolbar?: boolean;
  toolbarPosition?: 'top' | 'bottom';
  className?: string;
  toolbarClassName?: string;
  editorClassName?: string;
}

interface ToolbarButton {
  icon: React.ReactNode;
  command: string;
  value?: string;
  title: string;
  active?: boolean;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value = '',
  onChange,
  placeholder = 'Digite aqui...',
  minHeight = 200,
  maxHeight = 500,
  readOnly = false,
  autoFocus = false,
  showToolbar = true,
  toolbarPosition = 'top',
  className,
  toolbarClassName,
  editorClassName,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [activeFormats, setActiveFormats] = useState<Set<string>>(new Set());

  // Initialize content
  useEffect(() => {
    if (editorRef.current && value !== editorRef.current.innerHTML) {
      editorRef.current.innerHTML = value;
    }
  }, [value]);

  // Check active formats
  const checkActiveFormats = useCallback(() => {
    const formats = new Set<string>();
    
    if (document.queryCommandState('bold')) formats.add('bold');
    if (document.queryCommandState('italic')) formats.add('italic');
    if (document.queryCommandState('underline')) formats.add('underline');
    if (document.queryCommandState('strikeThrough')) formats.add('strikeThrough');
    if (document.queryCommandState('justifyLeft')) formats.add('justifyLeft');
    if (document.queryCommandState('justifyCenter')) formats.add('justifyCenter');
    if (document.queryCommandState('justifyRight')) formats.add('justifyRight');
    if (document.queryCommandState('justifyFull')) formats.add('justifyFull');
    if (document.queryCommandState('insertUnorderedList')) formats.add('insertUnorderedList');
    if (document.queryCommandState('insertOrderedList')) formats.add('insertOrderedList');

    setActiveFormats(formats);
  }, []);

  // Execute command
  const execCommand = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    checkActiveFormats();
    handleChange();
  }, [checkActiveFormats]);

  // Handle content change
  const handleChange = useCallback(() => {
    if (editorRef.current) {
      onChange?.(editorRef.current.innerHTML);
    }
  }, [onChange]);

  // Handle key events
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      document.execCommand('insertHTML', false, '&nbsp;&nbsp;&nbsp;&nbsp;');
    }

    // Shortcuts
    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case 'b':
          e.preventDefault();
          execCommand('bold');
          break;
        case 'i':
          e.preventDefault();
          execCommand('italic');
          break;
        case 'u':
          e.preventDefault();
          execCommand('underline');
          break;
        case 'z':
          if (e.shiftKey) {
            e.preventDefault();
            execCommand('redo');
          } else {
            e.preventDefault();
            execCommand('undo');
          }
          break;
      }
    }
  }, [execCommand]);

  // Insert link
  const insertLink = useCallback(() => {
    const url = prompt('Digite a URL:');
    if (url) {
      execCommand('createLink', url);
    }
  }, [execCommand]);

  // Insert image
  const insertImage = useCallback(() => {
    const url = prompt('Digite a URL da imagem:');
    if (url) {
      execCommand('insertImage', url);
    }
  }, [execCommand]);

  // Format block
  const formatBlock = useCallback((tag: string) => {
    execCommand('formatBlock', tag);
  }, [execCommand]);

  const toolbarButtons: ToolbarButton[][] = [
    [
      { icon: <Undo className="h-4 w-4" />, command: 'undo', title: 'Desfazer (Ctrl+Z)' },
      { icon: <Redo className="h-4 w-4" />, command: 'redo', title: 'Refazer (Ctrl+Shift+Z)' },
    ],
    [
      { icon: <Type className="h-4 w-4" />, command: 'formatBlock', value: 'p', title: 'Parágrafo' },
      { icon: <Heading1 className="h-4 w-4" />, command: 'formatBlock', value: 'h1', title: 'Título 1' },
      { icon: <Heading2 className="h-4 w-4" />, command: 'formatBlock', value: 'h2', title: 'Título 2' },
      { icon: <Heading3 className="h-4 w-4" />, command: 'formatBlock', value: 'h3', title: 'Título 3' },
    ],
    [
      { icon: <Bold className="h-4 w-4" />, command: 'bold', title: 'Negrito (Ctrl+B)', active: activeFormats.has('bold') },
      { icon: <Italic className="h-4 w-4" />, command: 'italic', title: 'Itálico (Ctrl+I)', active: activeFormats.has('italic') },
      { icon: <Underline className="h-4 w-4" />, command: 'underline', title: 'Sublinhado (Ctrl+U)', active: activeFormats.has('underline') },
      { icon: <Strikethrough className="h-4 w-4" />, command: 'strikeThrough', title: 'Tachado', active: activeFormats.has('strikeThrough') },
    ],
    [
      { icon: <AlignLeft className="h-4 w-4" />, command: 'justifyLeft', title: 'Alinhar à esquerda', active: activeFormats.has('justifyLeft') },
      { icon: <AlignCenter className="h-4 w-4" />, command: 'justifyCenter', title: 'Centralizar', active: activeFormats.has('justifyCenter') },
      { icon: <AlignRight className="h-4 w-4" />, command: 'justifyRight', title: 'Alinhar à direita', active: activeFormats.has('justifyRight') },
      { icon: <AlignJustify className="h-4 w-4" />, command: 'justifyFull', title: 'Justificar', active: activeFormats.has('justifyFull') },
    ],
    [
      { icon: <List className="h-4 w-4" />, command: 'insertUnorderedList', title: 'Lista com marcadores', active: activeFormats.has('insertUnorderedList') },
      { icon: <ListOrdered className="h-4 w-4" />, command: 'insertOrderedList', title: 'Lista numerada', active: activeFormats.has('insertOrderedList') },
    ],
    [
      { icon: <Link className="h-4 w-4" />, command: 'link', title: 'Inserir link' },
      { icon: <Image className="h-4 w-4" />, command: 'image', title: 'Inserir imagem' },
      { icon: <Code className="h-4 w-4" />, command: 'formatBlock', value: 'pre', title: 'Código' },
      { icon: <Quote className="h-4 w-4" />, command: 'formatBlock', value: 'blockquote', title: 'Citação' },
    ],
  ];

  const handleButtonClick = (button: ToolbarButton) => {
    if (button.command === 'link') {
      insertLink();
    } else if (button.command === 'image') {
      insertImage();
    } else if (button.command === 'formatBlock') {
      formatBlock(button.value || 'p');
    } else {
      execCommand(button.command, button.value);
    }
  };

  const Toolbar = (
    <div className={cn(
      'flex flex-wrap gap-1 p-2 border-b bg-muted/30',
      toolbarPosition === 'bottom' && 'border-b-0 border-t',
      toolbarClassName
    )}>
      {toolbarButtons.map((group, groupIndex) => (
        <React.Fragment key={groupIndex}>
          {groupIndex > 0 && <div className="w-px h-6 bg-border mx-1" />}
          {group.map((button, buttonIndex) => (
            <button
              key={buttonIndex}
              type="button"
              title={button.title}
              onClick={() => handleButtonClick(button)}
              disabled={readOnly}
              className={cn(
                'p-1.5 rounded hover:bg-accent transition-colors',
                button.active && 'bg-accent text-accent-foreground',
                readOnly && 'opacity-50 cursor-not-allowed'
              )}
            >
              {button.icon}
            </button>
          ))}
        </React.Fragment>
      ))}
    </div>
  );

  return (
    <div className={cn('rich-text-editor border rounded-lg overflow-hidden', className)}>
      {showToolbar && toolbarPosition === 'top' && Toolbar}
      
      <div
        ref={editorRef}
        contentEditable={!readOnly}
        onInput={handleChange}
        onKeyDown={handleKeyDown}
        onMouseUp={checkActiveFormats}
        onKeyUp={checkActiveFormats}
        data-placeholder={placeholder}
        className={cn(
          'p-4 outline-none overflow-y-auto prose prose-sm dark:prose-invert max-w-none',
          'empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground',
          readOnly && 'cursor-default',
          editorClassName
        )}
        style={{ minHeight, maxHeight }}
        autoFocus={autoFocus}
      />

      {showToolbar && toolbarPosition === 'bottom' && Toolbar}
    </div>
  );
};

export default RichTextEditor;
