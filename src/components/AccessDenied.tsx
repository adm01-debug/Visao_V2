/**
 * Access Denied Component
 * Página exibida quando o IP não está autorizado
 */

import { useEffect, useState } from 'react';
import { Shield, AlertTriangle, Mail, Phone, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { IP_MESSAGES } from '@/config/ipWhitelist';

interface AccessDeniedProps {
  showContactInfo?: boolean;
  showRetryButton?: boolean;
  onRetry?: () => void;
  customMessage?: string;
}

export const AccessDenied = ({
  showContactInfo = true,
  showRetryButton = true,
  onRetry,
  customMessage,
}: AccessDeniedProps) => {
  const [clientIP, setClientIP] = useState<string>('Carregando...');
  const [attemptTime] = useState(new Date().toLocaleString('pt-BR'));

  useEffect(() => {
    // Tentar obter IP do cliente
    fetch('https://api.ipify.org?format=json')
      .then(res => res.json())
      .then(data => setClientIP(data.ip))
      .catch(() => setClientIP('Não foi possível obter'));
  }, []);

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else {
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-red-900/20 to-slate-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg border-destructive/50 shadow-2xl">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-20 h-20 bg-destructive/20 rounded-full flex items-center justify-center">
            <Shield className="w-10 h-10 text-destructive" />
          </div>
          <CardTitle className="text-2xl font-bold text-destructive">
            Acesso Negado
          </CardTitle>
          <CardDescription className="text-lg">
            {customMessage || IP_MESSAGES.blocked}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Informações do acesso */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <AlertTriangle className="w-4 h-4 text-yellow-500" />
              <span className="font-medium">Seu IP:</span>
              <code className="bg-background px-2 py-0.5 rounded text-xs">
                {clientIP}
              </code>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>Tentativa em: {attemptTime}</span>
            </div>
          </div>

          {/* Motivo */}
          <div className="text-center text-sm text-muted-foreground">
            <p>Este sistema possui acesso restrito.</p>
            <p>Apenas IPs autorizados podem acessar.</p>
          </div>

          {/* Contato */}
          {showContactInfo && (
            <div className="border-t pt-4 space-y-3">
              <p className="text-sm font-medium text-center">
                Para solicitar acesso, entre em contato:
              </p>
              <div className="flex flex-col gap-2">
                <a 
                  href="mailto:admin@visao.app"
                  className="flex items-center gap-2 text-sm text-primary hover:underline justify-center"
                >
                  <Mail className="w-4 h-4" />
                  admin@visao.app
                </a>
                <a 
                  href="tel:+5511999999999"
                  className="flex items-center gap-2 text-sm text-primary hover:underline justify-center"
                >
                  <Phone className="w-4 h-4" />
                  (11) 99999-9999
                </a>
              </div>
            </div>
          )}

          {/* Ações */}
          <div className="flex flex-col gap-2">
            {showRetryButton && (
              <Button onClick={handleRetry} variant="outline" className="w-full">
                Tentar Novamente
              </Button>
            )}
            <Button 
              variant="ghost" 
              className="w-full text-muted-foreground"
              onClick={() => window.history.back()}
            >
              Voltar
            </Button>
          </div>

          {/* Aviso */}
          <p className="text-xs text-center text-muted-foreground">
            Todas as tentativas de acesso são registradas e monitoradas.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AccessDenied;
