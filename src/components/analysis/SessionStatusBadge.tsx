/**
 * VISÃO - Session Status Badge
 */
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { AnalysisSession } from '@/types/continuousAnalysis';

const STATUS_CONFIG: Record<AnalysisSession['status'], { color: string; label: string; pulse?: boolean }> = {
  idle: { color: 'bg-gray-500', label: 'Aguardando' },
  running: { color: 'bg-green-500', label: 'Executando', pulse: true },
  paused: { color: 'bg-yellow-500', label: 'Pausado' },
  error: { color: 'bg-red-500', label: 'Erro' },
  stopped: { color: 'bg-gray-500', label: 'Parado' },
  scheduled: { color: 'bg-blue-500', label: 'Agendado' },
};

export function SessionStatusBadge({ status }: { status: AnalysisSession['status'] }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <Badge className={cn('gap-1.5 text-white border-0', cfg.color)}>
      {cfg.pulse && <span className="w-2 h-2 bg-white rounded-full animate-pulse" />}
      {cfg.label}
    </Badge>
  );
}
