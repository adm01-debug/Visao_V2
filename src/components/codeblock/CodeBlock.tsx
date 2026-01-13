import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Copy, Check } from 'lucide-react';

interface CodeBlockProps { code: string; language?: string; showLineNumbers?: boolean; className?: string; }

export function CodeBlock({ code, language = 'javascript', showLineNumbers = true, className }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const lines = code.split('\n');

  const handleCopy = async () => { await navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  return (
    <div className={cn('relative rounded-lg overflow-hidden', className)}>
      <div className="flex items-center justify-between px-4 py-2 bg-muted/80 border-b">
        <span className="text-xs text-muted-foreground">{language}</span>
        <button onClick={handleCopy}>{copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}</button>
      </div>
      <pre className="p-4 bg-muted/40 overflow-auto text-sm font-mono">
        {lines.map((line, i) => (
          <div key={i} className="flex">
            {showLineNumbers && <span className="w-8 text-muted-foreground select-none">{i + 1}</span>}
            <code>{line}</code>
          </div>
        ))}
      </pre>
    </div>
  );
}

export default CodeBlock;
