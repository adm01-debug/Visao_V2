import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Mail, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface NewsletterSubscribeProps {
  onSubscribe: (email: string) => Promise<boolean>;
  title?: string;
  description?: string;
  className?: string;
}

export function NewsletterSubscribe({ onSubscribe, title = 'Newsletter', description = 'Receba atualizações', className }: NewsletterSubscribeProps) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    const success = await onSubscribe(email);
    setStatus(success ? 'success' : 'error');
    if (success) setEmail('');
  };

  return (
    <div className={cn('p-6 rounded-lg border bg-card', className)}>
      <h3 className="font-semibold mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground mb-4">{description}</p>
      {status === 'success' ? (
        <div className="flex items-center gap-2 text-green-600"><Check className="h-5 w-5" /><span>Inscrito com sucesso!</span></div>
      ) : (
        <form onSubmit={handleSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" className="pl-10" required />
          </div>
          <Button type="submit" disabled={status === 'loading'}>{status === 'loading' ? '...' : 'Inscrever'}</Button>
        </form>
      )}
      {status === 'error' && <p className="text-sm text-red-500 mt-2">Erro ao inscrever. Tente novamente.</p>}
    </div>
  );
}

export default NewsletterSubscribe;
