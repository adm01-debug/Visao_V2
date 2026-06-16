import { useState, useCallback } from 'react';
import { Shield, Smartphone, Loader2, CheckCircle2, QrCode } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export function SecurityMFAPanel() {
  const [loading, setLoading] = useState(false);
  const [step, setTabStep] = useState<'initial' | 'enrolling' | 'verified'>('initial');
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [verifyCode, setVerifyCode] = useState('');

  const enrollMFA = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp'
      });
      if (error) throw error;
      
      setFactorId(data.id);
      setQrCode(data.totp.qr_code);
      setTabStep('enrolling');
      toast.success('MFA iniciado');
    } catch (err) {
      toast.error('Erro ao iniciar MFA: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  }, []);

  const verifyMFA = useCallback(async () => {
    if (!factorId) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.mfa.challengeAndVerify({
        factorId,
        code: verifyCode
      });
      if (error) throw error;
      
      setTabStep('verified');
      toast.success('MFA ativado com sucesso!');
    } catch {
      toast.error('Código inválido ou erro na verificação');
    } finally {
      setLoading(false);
    }
  }, [factorId, verifyCode]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="w-5 h-5 text-primary" />
          Autenticação Multifator (MFA)
        </CardTitle>
        <CardDescription>
          Aumente a segurança da sua conta exigindo um código do seu celular ao fazer login.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {step === 'initial' && (
          <div className="flex flex-col items-center py-6 space-y-4 text-center">
            <Shield className="w-12 h-12 text-muted-foreground opacity-20" />
            <div className="space-y-2">
              <p className="font-medium">O MFA não está ativado</p>
              <p className="text-sm text-muted-foreground max-w-xs">
                Utilize aplicativos como Google Authenticator ou Authy para gerar códigos.
              </p>
            </div>
            <Button onClick={enrollMFA} disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Ativar agora
            </Button>
          </div>
        )}

        {step === 'enrolling' && (
          <div className="space-y-6">
            <div className="flex flex-col items-center space-y-4 text-center">
              <p className="text-sm font-medium">Escaneie o código QR no seu aplicativo de autenticação:</p>
              {qrCode ? (
                <div className="p-4 bg-card rounded-xl border">
                  <img src={qrCode} alt="QR Code MFA" className="w-48 h-48" />
                </div>
              ) : (
                <div className="w-48 h-48 bg-muted animate-pulse rounded-xl flex items-center justify-center">
                  <QrCode className="w-10 h-10 text-muted-foreground opacity-20" />
                </div>
              )}
            </div>
            
            <div className="space-y-2 max-w-xs mx-auto">
              <Label htmlFor="mfa-code">Código de verificação</Label>
              <div className="flex gap-2">
                <Input 
                  id="mfa-code"
                  placeholder="000000" 
                  value={verifyCode} 
                  onChange={(e) => setVerifyCode(e.target.value)}
                  maxLength={6}
                />
                <Button onClick={verifyMFA} disabled={loading || verifyCode.length < 6}>
                  {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Verificar
                </Button>
              </div>
            </div>
          </div>
        )}

        {step === 'verified' && (
          <div className="flex flex-col items-center py-6 space-y-4 text-center">
            <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-success" />
            </div>
            <div className="space-y-2">
              <p className="font-medium text-lg">MFA Ativado!</p>
              <p className="text-sm text-muted-foreground max-w-xs">
                Sua conta agora está protegida com autenticação em duas etapas.
              </p>
            </div>
            <Button variant="outline" onClick={() => setTabStep('initial')}>
              Configurações Avançadas
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
