/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Página: AuthCallback - Callback de autenticação OAuth
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processando autenticação...');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the session from URL
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          throw error;
        }

        if (session) {
          setStatus('success');
          setMessage('Login realizado com sucesso!');
          
          // Redirect to dashboard after short delay
          setTimeout(() => {
            navigate('/dashboard', { replace: true });
          }, 1500);
        } else {
          // Try to exchange code for session
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          const queryParams = new URLSearchParams(window.location.search);
          
          const accessToken = hashParams.get('access_token') || queryParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token') || queryParams.get('refresh_token');

          if (accessToken && refreshToken) {
            const { error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (sessionError) throw sessionError;

            setStatus('success');
            setMessage('Login realizado com sucesso!');
            
            setTimeout(() => {
              navigate('/dashboard', { replace: true });
            }, 1500);
          } else {
            throw new Error('Tokens não encontrados');
          }
        }
      } catch (error) {
        console.error('Auth callback error:', error);
        setStatus('error');
        setMessage('Erro na autenticação. Redirecionando...');
        
        setTimeout(() => {
          navigate('/auth', { replace: true });
        }, 2000);
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        {status === 'loading' && (
          <>
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
            <p className="text-lg text-muted-foreground">{message}</p>
          </>
        )}
        
        {status === 'success' && (
          <>
            <CheckCircle className="h-12 w-12 mx-auto text-green-500" />
            <p className="text-lg text-green-600">{message}</p>
          </>
        )}
        
        {status === 'error' && (
          <>
            <XCircle className="h-12 w-12 mx-auto text-red-500" />
            <p className="text-lg text-red-600">{message}</p>
          </>
        )}
      </div>
    </div>
  );
}
