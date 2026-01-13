import React from 'react';
import { cn } from '@/lib/utils';
import { Sparkles, Wand2, Bot, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AIActionButtonProps { label?: string; loading?: boolean; disabled?: boolean; onClick?: () => void; variant?: 'default' | 'magic' | 'subtle'; className?: string; }

export function AIActionButton({ label = 'Gerar com IA', loading, disabled, onClick, variant = 'default', className }: AIActionButtonProps) {
  const variants = {
    default: 'bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white',
    magic: 'bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 hover:from-pink-600 hover:via-purple-600 hover:to-indigo-600 text-white',
    subtle: 'bg-primary/10 text-primary hover:bg-primary/20',
  };

  return (
    <Button onClick={onClick} disabled={disabled || loading} className={cn('relative overflow-hidden', variants[variant], className)}>
      {loading ? <><span className="animate-spin mr-2"><Bot className="h-4 w-4" /></span>Processando...</> : <><Sparkles className="h-4 w-4 mr-2" />{label}</>}
      {variant === 'magic' && <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-shimmer" />}
    </Button>
  );
}

export default AIActionButton;
