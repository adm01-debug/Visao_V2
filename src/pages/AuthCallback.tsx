/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Página: AuthCallback - Callback de autenticação OAuth
 *
 * Standalone page — renders OUTSIDE MainLayout (no BottomNavigation).
 * Listed in scripts/check-mobile-nav.mjs ALLOWLIST.
 * Reason: handler OAuth pós-redirect (Google); renderiza apenas spinner
 * durante a troca de código por sessão, sem UI navegável.
 * See docs/LAYOUTS.md §11 — Camada 0.
 */

import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

export default function AuthCallback() {
  const navigate = useNavigate();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
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
          timeoutRef.current = setTimeout(() => {
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
            
            timeoutRef.current = setTimeout(() => {
              navigate('/dashboard', { replace: true });
            }, 1500);
          } else {
            throw new Error('Tokens não encontrados');
          }
        }
      } catch (_error) {
        // Auth callback error handled silently
        setStatus('error');
        setMessage('Erro na autenticação. Redirecionando...');
        
        timeoutRef.current = setTimeout(() => {
          navigate('/auth', { replace: true });
        }, 2000);
      }
    };

    handleCallback();
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
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
            <CheckCircle className="h-12 w-12 mx-auto text-success" />
            <p className="text-lg text-success">{message}</p>
          </>
        )}
        
        {status === 'error' && (
          <>
            <XCircle className="h-12 w-12 mx-auto text-destructive" />
            <p className="text-lg text-destructive">{message}</p>
          </>
        )}
      </div>
    </div>
  );
}
