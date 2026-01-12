import React, { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { RefreshCw, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PasswordGeneratorProps {
  length?: number;
  includeNumbers?: boolean;
  includeSymbols?: boolean;
  includeUppercase?: boolean;
  onGenerate?: (password: string) => void;
  className?: string;
}

export function PasswordGenerator({ length = 16, includeNumbers = true, includeSymbols = true, includeUppercase = true, onGenerate, className }: PasswordGeneratorProps) {
  const [password, setPassword] = useState('');
  const [copied, setCopied] = useState(false);

  const generate = useCallback(() => {
    let chars = 'abcdefghijklmnopqrstuvwxyz';
    if (includeUppercase) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (includeNumbers) chars += '0123456789';
    if (includeSymbols) chars += '!@#$%^&*()_+-=[]{}|;:,.<>?';
    const pwd = Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    setPassword(pwd);
    onGenerate?.(pwd);
  }, [length, includeNumbers, includeSymbols, includeUppercase, onGenerate]);

  const copy = async () => { await navigator.clipboard.writeText(password); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex gap-2">
        <code className="flex-1 px-3 py-2 bg-muted rounded font-mono text-sm overflow-x-auto">{password || 'Clique para gerar'}</code>
        <Button variant="outline" size="icon" onClick={generate}><RefreshCw className="h-4 w-4" /></Button>
        <Button variant="outline" size="icon" onClick={copy} disabled={!password}>{copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}</Button>
      </div>
    </div>
  );
}

export default PasswordGenerator;
