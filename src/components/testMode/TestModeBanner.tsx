import { Link } from 'react-router-dom';
import { FlaskConical, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTestMode } from '@/hooks/useTestMode';
import { TestModeCountdown } from './TestModeCountdown';

export function TestModeBanner() {
  const { activeSession, stop, refetch } = useTestMode();

  if (!activeSession) return null;

  const scopeLabel =
    activeSession.scope === 'all'
      ? 'Todas as câmeras e regras'
      : activeSession.scope === 'camera'
        ? `${activeSession.scope_ids.length} câmera(s)`
        : `${activeSession.scope_ids.length} regra(s)`;

  return (
    <div
      role="status"
      aria-label="Modo teste ativo"
      className="flex flex-wrap items-center justify-between gap-3 border-b border-warning/40 bg-warning/10 px-4 py-2 text-sm text-warning-foreground"
    >
      <div className="flex flex-wrap items-center gap-3">
        <Badge
          variant="outline"
          className="border-warning/50 bg-warning/20 text-warning-foreground"
        >
          <FlaskConical className="mr-1 h-3.5 w-3.5" />
          Modo teste
        </Badge>
        <span className="text-foreground/80">
          Detecções apenas em <strong>dry-run</strong> — nenhuma notificação será enviada.
        </span>
        <span className="text-foreground/70">
          Escopo: <strong>{scopeLabel}</strong>
        </span>
        <span className="text-foreground/70">
          Restante:{' '}
          <TestModeCountdown expiresAt={activeSession.expires_at} onExpire={() => refetch()} />
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Button asChild size="sm" variant="ghost">
          <Link to="/test-mode">Ver detecções</Link>
        </Button>
        <Button size="sm" variant="outline" onClick={() => stop()}>
          <X className="mr-1 h-3.5 w-3.5" />
          Encerrar agora
        </Button>
      </div>
    </div>
  );
}
