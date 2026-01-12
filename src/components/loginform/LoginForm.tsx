import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { User, Lock, Eye, EyeOff, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface LoginFormProps {
  onSubmit: (email: string, password: string) => void;
  loading?: boolean;
  error?: string;
  className?: string;
}

export function LoginForm({ onSubmit, loading, error, className }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(email, password);
  };

  return (
    <form onSubmit={handleSubmit} className={cn('space-y-4', className)}>
      <div className="relative">
        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input type="email" placeholder="E-mail" value={email} onChange={e => setEmail(e.target.value)} className="pl-10" required />
      </div>
      <div className="relative">
        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input type={showPassword ? 'text' : 'password'} placeholder="Senha" value={password} onChange={e => setPassword(e.target.value)} className="pl-10 pr-10" required />
        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2">
          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Entrando...' : <><LogIn className="h-4 w-4 mr-2" />Entrar</>}
      </Button>
    </form>
  );
}

export default LoginForm;
