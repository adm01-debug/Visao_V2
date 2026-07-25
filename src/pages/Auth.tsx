/**
 * Auth Page (Refactored) — Forms extracted to ./auth/AuthForms.tsx
 *
 * Standalone page — renders OUTSIDE MainLayout (no BottomNavigation).
 * Listed in scripts/check-mobile-nav.mjs ALLOWLIST.
 * Reason: tela de login/signup pré-autenticação; layout próprio centralizado.
 * See docs/LAYOUTS.md §11 — Camada 0.
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Shield, Loader2 } from 'lucide-react';
import { PageMeta } from '@/components/PageMeta';
import { supabase } from '@/integrations/supabase/client';
import { LoginForm, RegisterForm } from './auth/AuthForms';

import { getPasswordStrength } from '@/components/ui/PasswordStrength';

const emailSchema = z.string().email('Email inválido').max(255);
const passwordSchema = z.string().min(6, 'Senha deve ter no mínimo 6 caracteres').max(72);
const nameSchema = z.string().max(100).optional();

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const { signIn, signUp, user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => { if (!loading && user) navigate('/', { replace: true }); }, [user, loading, navigate]);

  const validateForm = (isSignUp: boolean) => {
    const e: Record<string, string> = {};
    const er = emailSchema.safeParse(email); if (!er.success) e.email = er.error.issues[0]?.message ?? 'Email inválido';
    const pr = passwordSchema.safeParse(password); if (!pr.success) e.password = pr.error.issues[0]?.message ?? 'Senha inválida';
    if (isSignUp && fullName) { const nr = nameSchema.safeParse(fullName); if (!nr.success) e.fullName = nr.error.issues[0]?.message ?? 'Nome inválido'; }
    // Block weak/leaked passwords on signup
    if (isSignUp && !e.password) {
      const strength = getPasswordStrength(password);
      if (strength.isBlocked) {
        e.password = strength.blockReason || 'Senha muito fraca';
      }
    }
    setErrors(e); return Object.keys(e).length === 0;
  };

  const handleSignIn = async (ev: React.FormEvent) => {
    ev.preventDefault(); if (!validateForm(false)) return;
    setIsLoading(true); const { error } = await signIn(email, password); setIsLoading(false);
    if (error) toast({ title: 'Erro ao entrar', description: error.message === 'Invalid login credentials' ? 'Email ou senha incorretos' : error.message, variant: 'destructive' });
  };

  const handleSignUp = async (ev: React.FormEvent) => {
    ev.preventDefault(); if (!validateForm(true)) return;
    setIsLoading(true); const { error } = await signUp(email, password, fullName); setIsLoading(false);
    if (error) { let msg = error.message; if (msg.includes('already registered')) msg = 'Este email já está cadastrado'; toast({ title: 'Erro ao criar conta', description: msg, variant: 'destructive' }); }
    else toast({ title: 'Conta criada com sucesso!', description: 'Você já pode acessar o sistema.' });
  };

  const handleForgotPassword = async () => {
    if (!email) { setErrors({ email: 'Digite seu email' }); return; }
    setIsLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
    setIsLoading(false);
    if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    else setResetEmailSent(true);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const formProps = { email, password, showPassword, isLoading, errors, onEmailChange: setEmail, onPasswordChange: setPassword, onTogglePassword: () => setShowPassword(!showPassword) };

  return (
    <>
      <PageMeta title="Login" description="Acesse o sistema de vigilância inteligente VISÃO" />
      <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, hsl(var(--foreground)) 1px, transparent 0)', backgroundSize: '32px 32px' }} />
        {/* Ambient Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-20 blur-[120px] pointer-events-none" style={{ background: 'radial-gradient(circle, hsl(var(--primary) / 0.4), transparent 70%)' }} />

        <div className="w-full max-w-md relative z-10">
          <div className="flex items-center justify-center gap-3 mb-8 animate-fade-in">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center shadow-lg" style={{ boxShadow: '0 0 30px hsl(var(--primary) / 0.35)' }}>
              <Shield className="w-7 h-7 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-bold text-2xl text-foreground tracking-tight">VISÃO</h1>
              <p className="text-xs text-muted-foreground tracking-widest uppercase">Vigilância Inteligente</p>
            </div>
          </div>
          <Card className="border-border/50 bg-card/80 backdrop-blur-xl shadow-2xl animate-fade-in-delay-1" style={{ boxShadow: 'var(--shadow-card), 0 0 60px hsl(var(--primary) / 0.05)' }}>
            <Tabs defaultValue="login" className="w-full">
              <CardHeader className="pb-4"><TabsList className="grid w-full grid-cols-2"><TabsTrigger value="login">Entrar</TabsTrigger><TabsTrigger value="register">Criar Conta</TabsTrigger></TabsList></CardHeader>
              <CardContent>
                <TabsContent value="login" className="mt-0"><LoginForm {...formProps} onSubmit={handleSignIn} onForgotPassword={() => setShowForgotPassword(true)} /></TabsContent>
                <TabsContent value="register" className="mt-0"><RegisterForm {...formProps} fullName={fullName} onFullNameChange={setFullName} onSubmit={handleSignUp} /></TabsContent>
              </CardContent>
            </Tabs>
          </Card>
          <p className="text-center text-xs text-muted-foreground mt-6 animate-fade-in-delay-2">Protegido com criptografia de ponta a ponta</p>
        </div>
      </div>
      <Dialog open={showForgotPassword} onOpenChange={(open) => { setShowForgotPassword(open); if (!open) setResetEmailSent(false); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Recuperar Senha</DialogTitle><DialogDescription>{resetEmailSent ? 'Email de recuperação enviado! Verifique sua caixa de entrada.' : 'Digite seu email para receber o link de recuperação de senha.'}</DialogDescription></DialogHeader>
          {resetEmailSent ? <DialogFooter><Button onClick={() => { setShowForgotPassword(false); setResetEmailSent(false); }}>Fechar</Button></DialogFooter> : (
            <><Input type="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Email para recuperação" />
            <DialogFooter className="gap-2 sm:gap-0"><Button variant="outline" onClick={() => setShowForgotPassword(false)}>Cancelar</Button><Button onClick={handleForgotPassword} disabled={isLoading}>{isLoading ? 'Enviando...' : 'Enviar'}</Button></DialogFooter></>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
