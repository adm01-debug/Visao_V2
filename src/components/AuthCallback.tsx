/**
 * VISÃO - Sistema de Vigilância Inteligente
 * AuthCallback Component
 */

import { memo, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { LoadingSpinner } from './LoadingSpinner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, XCircle, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';

type AuthCallbackStatus = 'loading' | 'success' | 'error' | 'email-confirmed';

interface AuthCallbackProps {
  redirectTo?: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

function AuthCallbackComponent({ 
  redirectTo = '/dashboard',
  onSuccess,
  onError 
}: AuthCallbackProps) {
  const [status, setStatus] = useState<AuthCallbackStatus>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const error = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');
        
        if (error) {
          throw new Error(errorDescription || error);
        }

        const type = searchParams.get('type');
        
        if (type === 'recovery') {
          // Password recovery flow
          navigate('/reset-password');
          return;
        }

        if (type === 'signup' || type === 'email_confirmation') {
          setStatus('email-confirmed');
          setTimeout(() => {
            navigate(redirectTo);
            onSuccess?.();
          }, 2000);
          return;
        }

        // Handle OAuth callback
        const { data, error: authError } = await supabase.auth.getSession();
        
        if (authError) {
          throw authError;
        }

        if (data.session) {
          setStatus('success');
          onSuccess?.();
          setTimeout(() => navigate(redirectTo), 1500);
        } else {
          throw new Error('Sessão não encontrada');
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Erro desconhecido');
        setStatus('error');
        setErrorMessage(error.message);
        onError?.(error);
      }
    };

    handleCallback();
  }, [navigate, redirectTo, searchParams, onSuccess, onError]);

  const handleRetry = () => {
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>
            {status === 'loading' && 'Autenticando...'}
            {status === 'success' && 'Autenticado com Sucesso!'}
            {status === 'email-confirmed' && 'Email Confirmado!'}
            {status === 'error' && 'Erro de Autenticação'}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          {status === 'loading' && (
            <>
              <LoadingSpinner size="lg" />
              <p className="text-muted-foreground">Processando autenticação...</p>
            </>
          )}
          
          {status === 'success' && (
            <>
              <CheckCircle className="w-16 h-16 text-green-500" />
              <p className="text-muted-foreground">Redirecionando...</p>
            </>
          )}
          
          {status === 'email-confirmed' && (
            <>
              <Mail className="w-16 h-16 text-primary" />
              <p className="text-muted-foreground">Seu email foi confirmado com sucesso!</p>
              <p className="text-sm text-muted-foreground">Redirecionando para o dashboard...</p>
            </>
          )}
          
          {status === 'error' && (
            <>
              <XCircle className="w-16 h-16 text-destructive" />
              <p className="text-destructive text-center">{errorMessage}</p>
              <Button onClick={handleRetry} className="mt-4">
                Tentar Novamente
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export const AuthCallback = memo(AuthCallbackComponent);
