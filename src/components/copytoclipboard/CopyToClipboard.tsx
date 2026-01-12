import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CopyToClipboardProps {
  text: string;
  children?: React.ReactNode;
  onCopy?: () => void;
  className?: string;
}

export function CopyToClipboard({ text, children, onCopy, className }: CopyToClipboardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    onCopy?.();
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn('inline-flex items-center gap-2', className)}>
      {children || <code className="px-2 py-1 bg-muted rounded text-sm font-mono">{text}</code>}
      <Button variant="ghost" size="sm" onClick={handleCopy}>
        {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
      </Button>
    </div>
  );
}

export default CopyToClipboard;
