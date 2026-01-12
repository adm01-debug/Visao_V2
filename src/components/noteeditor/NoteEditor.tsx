import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Bold, Italic, List, Link, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface NoteEditorProps {
  initialContent?: string;
  onSave?: (content: string) => void;
  placeholder?: string;
  className?: string;
}

export function NoteEditor({ initialContent = '', onSave, placeholder = 'Escreva sua nota...', className }: NoteEditorProps) {
  const [content, setContent] = useState(initialContent);

  const insertMarkdown = (before: string, after: string = before) => {
    const textarea = document.querySelector('textarea');
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = content.substring(start, end);
    const newContent = content.substring(0, start) + before + selected + after + content.substring(end);
    setContent(newContent);
  };

  return (
    <div className={cn('border rounded-lg overflow-hidden', className)}>
      <div className="flex items-center gap-1 p-2 border-b bg-muted/30">
        <Button variant="ghost" size="sm" onClick={() => insertMarkdown('**')}><Bold className="h-4 w-4" /></Button>
        <Button variant="ghost" size="sm" onClick={() => insertMarkdown('*')}><Italic className="h-4 w-4" /></Button>
        <Button variant="ghost" size="sm" onClick={() => insertMarkdown('\n- ')}><List className="h-4 w-4" /></Button>
        <Button variant="ghost" size="sm" onClick={() => insertMarkdown('[', '](url)')}><Link className="h-4 w-4" /></Button>
        <div className="flex-1" />
        {onSave && <Button size="sm" onClick={() => onSave(content)}><Save className="h-4 w-4 mr-1" />Salvar</Button>}
      </div>
      <textarea value={content} onChange={e => setContent(e.target.value)} placeholder={placeholder}
        className="w-full min-h-[200px] p-4 resize-none bg-background focus:outline-none" />
      <div className="px-4 py-2 border-t bg-muted/30 text-xs text-muted-foreground">{content.length} caracteres</div>
    </div>
  );
}

export default NoteEditor;
