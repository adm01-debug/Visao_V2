/**
 * VISÃO — Empty state acionável para cadastro da primeira câmera.
 * Exibe checklist rápido e CTA em destaque para o fluxo guiado.
 */
import { Camera, ShieldCheck, Wifi, KeyRound, Gamepad2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface FirstCameraEmptyStateProps {
  onStart: () => void;
}

const CHECKLIST: Array<{ icon: typeof Wifi; label: string; hint: string }> = [
  {
    icon: Wifi,
    label: 'RTSP acessível',
    hint: 'A câmera precisa responder na sua rede (LAN ou VPN).',
  },
  {
    icon: KeyRound,
    label: 'Credenciais em mãos',
    hint: 'Usuário e senha do stream (serão cifrados no cofre).',
  },
  {
    icon: Gamepad2,
    label: 'PTZ (opcional)',
    hint: 'Se sua câmera se move, teremos ONVIF automático.',
  },
];

export function FirstCameraEmptyState({ onStart }: FirstCameraEmptyStateProps) {
  return (
    <Card className="mx-auto max-w-2xl border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background p-8 md:p-10">
      <div className="flex flex-col items-center text-center">
        <div className="relative mb-5">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
            <Camera className="h-10 w-10 text-primary" aria-hidden />
          </div>
          <ShieldCheck
            className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-background p-0.5 text-success"
            aria-hidden
          />
        </div>

        <h2 className="text-xl font-semibold tracking-tight md:text-2xl">
          Cadastre sua primeira câmera
        </h2>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          Fluxo guiado com <strong>validação RTSP obrigatória</strong> e{' '}
          <strong>criptografia das credenciais</strong> em envelope encryption (AES-GCM + KEK).
        </p>

        <Badge
          variant="outline"
          className="mt-3 gap-1 border-success/30 bg-success/10 text-success"
        >
          <ShieldCheck className="h-3 w-3" aria-hidden />
          Credenciais nunca saem em texto puro do seu navegador
        </Badge>
      </div>

      <ul className="mt-8 grid gap-3 sm:grid-cols-3">
        {CHECKLIST.map(({ icon: Icon, label, hint }) => (
          <li
            key={label}
            className="flex flex-col gap-1.5 rounded-md border bg-card/50 p-3 text-left"
          >
            <div className="flex items-center gap-2 text-sm font-medium">
              <Icon className="h-4 w-4 text-primary" aria-hidden />
              {label}
            </div>
            <p className="text-xs leading-snug text-muted-foreground">{hint}</p>
          </li>
        ))}
      </ul>

      <div className="mt-8 flex flex-col items-center gap-2">
        <Button size="lg" onClick={onStart} className="gap-2">
          Iniciar cadastro guiado
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Button>
        <p className="text-[11px] text-muted-foreground">
          Leva menos de 2 minutos. Você pode testar o stream antes de salvar.
        </p>
      </div>
    </Card>
  );
}

export default FirstCameraEmptyState;
