import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ClipboardButtonProps {
  text: string;
  label?: string;
  successMessage?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'default' | 'lg';
  className?: string;
}

export function ClipboardButton({ text, label, successMessage = 'Copiado!', variant = 'outline', size = 'default', className }: ClipboardButtonProps) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button variant={variant} size={size} onClick={copy} className={cn(copied && 'text-green-500', className)}>
      {copied ? <><Check className="h-4 w-4 mr-1" />{successMessage}</> : <><Copy className="h-4 w-4 mr-1" />{label || 'Copiar'}</>}
    </Button>
  );
}

export default ClipboardButton;
