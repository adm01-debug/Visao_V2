import React from 'react';
import { cn } from '@/lib/utils';
import { Home, ArrowLeft, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface NotFoundPageProps {
  title?: string;
  description?: string;
  onGoHome?: () => void;
  onGoBack?: () => void;
  className?: string;
}

export function NotFoundPage({ title = '404', description = 'Página não encontrada', onGoHome, onGoBack, className }: NotFoundPageProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center min-h-[400px] text-center p-8', className)}>
      <div className="text-8xl font-bold text-muted-foreground/20 mb-4">{title}</div>
      <Search className="h-16 w-16 text-muted-foreground mb-4" />
      <h1 className="text-2xl font-semibold mb-2">{description}</h1>
      <p className="text-muted-foreground mb-6">A página que você está procurando não existe ou foi movida.</p>
      <div className="flex gap-3">
        {onGoBack && <Button variant="outline" onClick={onGoBack}><ArrowLeft className="h-4 w-4 mr-2" />Voltar</Button>}
        {onGoHome && <Button onClick={onGoHome}><Home className="h-4 w-4 mr-2" />Página Inicial</Button>}
      </div>
    </div>
  );
}

export default NotFoundPage;
