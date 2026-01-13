import React from 'react';
import { cn } from '@/lib/utils';
import { Code, FileJson, FileCode, Braces } from 'lucide-react';

interface CodeSnippetProps { code: string; language?: string; filename?: string; showLineNumbers?: boolean; className?: string; }

export function CodeSnippet({ code, language = 'typescript', filename, showLineNumbers = true, className }: CodeSnippetProps) {
  const lines = code.split('\n');
  return (
    <div className={cn('rounded-lg border bg-zinc-900 overflow-hidden', className)}>
      {filename && <div className="flex items-center gap-2 px-4 py-2 bg-zinc-800 border-b border-zinc-700"><FileCode className="h-4 w-4 text-zinc-400" /><span className="text-sm text-zinc-400">{filename}</span><span className="ml-auto text-xs text-zinc-500">{language}</span></div>}
      <pre className="p-4 overflow-x-auto"><code className="text-sm text-zinc-100">
        {lines.map((line, i) => <div key={i} className="flex">{showLineNumbers && <span className="w-8 text-zinc-500 select-none">{i + 1}</span>}<span>{line}</span></div>)}
      </code></pre>
    </div>
  );
}

export default CodeSnippet;
