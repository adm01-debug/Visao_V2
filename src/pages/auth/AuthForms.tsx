import React, { useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { CardTitle, CardDescription } from '@/components/ui/card';
import { OAuthButtons } from '@/components/OAuthButtons';
import { PasswordStrength, getPasswordStrength } from '@/components/ui/PasswordStrength';
import { Loader2, Eye, EyeOff } from 'lucide-react';

interface AuthFormProps {
  email: string;
  password: string;
  showPassword: boolean;
  isLoading: boolean;
  errors: Record<string, string>;
  onEmailChange: (v: string) => void;
  onPasswordChange: (v: string) => void;
  onTogglePassword: () => void;
}

interface LoginFormProps extends AuthFormProps {
  onSubmit: (e: React.FormEvent) => void;
  onForgotPassword: () => void;
}

export function LoginForm({ email, password, showPassword, isLoading, errors, onEmailChange, onPasswordChange, onTogglePassword, onSubmit, onForgotPassword }: LoginFormProps) {
  return (
    <>
      <CardTitle className="text-lg mb-1">Bem-vindo de volta</CardTitle>
      <CardDescription className="mb-6">Entre com suas credenciais para acessar o sistema</CardDescription>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="login-email">Email</Label>
          <Input id="login-email" type="email" placeholder="seu@email.com" value={email} onChange={(e) => onEmailChange(e.target.value)} disabled={isLoading} className={errors.email ? 'border-destructive' : ''} />
          {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="login-password">Senha</Label>
          <div className="relative">
            <Input id="login-password" type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={(e) => onPasswordChange(e.target.value)} disabled={isLoading} className={errors.password ? 'border-destructive pr-10' : 'pr-10'} />
            <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full px-3 hover:bg-transparent" onClick={onTogglePassword}>
              {showPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
            </Button>
          </div>
          {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
        </div>
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Entrando...</> : 'Entrar'}
        </Button>
        <OAuthButtons disabled={isLoading} />
        <Button type="button" variant="link" className="w-full text-sm" onClick={onForgotPassword}>Esqueceu a senha?</Button>
      </form>
    </>
  );
}

interface RegisterFormProps extends AuthFormProps {
  fullName: string;
  onFullNameChange: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function RegisterForm({ email, password, fullName, showPassword, isLoading, errors, onEmailChange, onPasswordChange, onFullNameChange, onTogglePassword, onSubmit }: RegisterFormProps) {
  return (
    <>
      <CardTitle className="text-lg mb-1">Criar nova conta</CardTitle>
      <CardDescription className="mb-6">Preencha os dados para começar a usar o VisionAI</CardDescription>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="register-name">Nome completo</Label>
          <Input id="register-name" type="text" placeholder="Seu nome" value={fullName} onChange={(e) => onFullNameChange(e.target.value)} disabled={isLoading} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="register-email">Email</Label>
          <Input id="register-email" type="email" placeholder="seu@email.com" value={email} onChange={(e) => onEmailChange(e.target.value)} disabled={isLoading} className={errors.email ? 'border-destructive' : ''} />
          {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="register-password">Senha</Label>
          <div className="relative">
            <Input id="register-password" type={showPassword ? 'text' : 'password'} placeholder="Mínimo 6 caracteres" value={password} onChange={(e) => onPasswordChange(e.target.value)} disabled={isLoading} className={errors.password ? 'border-destructive pr-10' : 'pr-10'} />
            <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full px-3 hover:bg-transparent" onClick={onTogglePassword}>
              {showPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
            </Button>
          </div>
          {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
          <PasswordStrength password={password} />
        </div>
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Criando conta...</> : 'Criar conta'}
        </Button>
        <OAuthButtons disabled={isLoading} />
      </form>
    </>
  );
}
