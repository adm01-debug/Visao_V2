import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Mail, X, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface NewsletterBannerProps { title?: string; description?: string; onSubscribe?: (email: string) => void; dismissible?: boolean; className?: string; }

export function NewsletterBanner({ title = 'Inscreva-se na Newsletter', description = 'Receba as últimas novidades', onSubscribe, dismissible = true, className }: NewsletterBannerProps) {
  const [email, setEmail] = useState('');
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className={cn('p-6 bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg border', className)}>
      <div className="flex flex-col md:flex-row items-center gap-4">
        <Mail className="h-10 w-10 text-primary" />
        <div className="flex-1 text-center md:text-left"><h3 className="font-semibold">{title}</h3><p className="text-sm text-muted-foreground">{description}</p></div>
        <div className="flex gap-2 w-full md:w-auto">
          <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Seu e-mail" className="max-w-xs" />
          <Button onClick={() => onSubscribe?.(email)}><Send className="h-4 w-4" /></Button>
        </div>
        {dismissible && <button onClick={() => setDismissed(true)} className="absolute top-2 right-2 md:static"><X className="h-4 w-4" /></button>}
      </div>
    </div>
  );
}

export default NewsletterBanner;
