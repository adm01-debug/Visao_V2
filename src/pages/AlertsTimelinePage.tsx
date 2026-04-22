/**
 * VISÃO - AlertsTimelinePage
 *
 * Timeline cronológica de alertas com replay curto (antes/depois) usando o
 * `AlertReplayPlayer`. Permite filtrar por câmera e severidade, e seleciona
 * automaticamente o alerta mais recente.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Clock,
  Filter,
  Search,
  Camera as CameraIcon,
  ShieldAlert,
  CheckCircle2,
  PlayCircle,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAlerts, type DbAlert } from '@/hooks/useAlerts';
import { useCameras } from '@/hooks/useCameras';
import { useReplayQuery } from '@/hooks/useFrameBuffer';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { PageMeta } from '@/components/PageMeta';
import { AlertReplayPlayer } from '@/components/alerts-timeline/AlertReplayPlayer';

const SEVERITY_STYLES: Record<string, { label: string; dot: string; text: string; ring: string }> = {
  critical: { label: 'Crítico', dot: 'bg-destructive', text: 'text-destructive', ring: 'ring-destructive/40' },
  high: { label: 'Alto', dot: 'bg-destructive/80', text: 'text-destructive', ring: 'ring-destructive/30' },
  medium: { label: 'Médio', dot: 'bg-warning', text: 'text-warning', ring: 'ring-warning/30' },
  low: { label: 'Baixo', dot: 'bg-info', text: 'text-info', ring: 'ring-info/30' },
};

export default function AlertsTimelinePage() {
  const { alerts, loading } = useAlerts();
  const { cameras } = useCameras();
  const { hasFramesFor } = useReplayQuery();

  const [search, setSearch] = useState('');
  const [cameraFilter, setCameraFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return alerts.filter((a) => {
      if (cameraFilter !== 'all' && a.camera_id !== cameraFilter) return false;
      if (severityFilter !== 'all' && a.severity !== severityFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const hay = [a.message, a.camera_name, a.type].filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [alerts, cameraFilter, severityFilter, search]);

  // Auto-seleciona o primeiro alerta da lista filtrada
  useEffect(() => {
    if (filtered.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !filtered.some((a) => a.id === selectedId)) {
      setSelectedId(filtered[0]?.id ?? null);
    }
  }, [filtered, selectedId]);

  const selected: DbAlert | null = useMemo(
    () => filtered.find((a) => a.id === selectedId) ?? null,
    [filtered, selectedId],
  );

  const stats = useMemo(() => {
    const total = alerts.length;
    const unread = alerts.filter((a) => !a.is_read).length;
    const critical = alerts.filter((a) => a.severity === 'critical' || a.severity === 'high').length;
    const replayable = alerts.filter((a) => a.camera_id && hasFramesFor(a.camera_id)).length;
    return { total, unread, critical, replayable };
  }, [alerts, hasFramesFor]);

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <PageMeta title="Timeline de Alertas" description="Linha do tempo de alertas com replay curto antes e depois do evento" />
        <Skeleton className="h-10 w-72" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <div className="grid lg:grid-cols-[380px_1fr] gap-4">
          <Skeleton className="h-[500px]" />
          <Skeleton className="h-[500px]" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <PageMeta
        title="Timeline de Alertas | VISÃO"
        description="Linha do tempo de alertas em tempo real com replay curto das cenas antes e depois de cada evento detectado."
      />

      {/* Header */}
      <header>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ShieldAlert className="w-7 h-7 text-primary" />
          Timeline de Alertas
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Linha do tempo de eventos detectados com replay curto (
          {30}s antes / {30}s depois) das cenas em torno de cada alerta.
        </p>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total" value={stats.total} icon={<AlertTriangle className="w-4 h-4" />} />
        <StatCard label="Não lidos" value={stats.unread} tone={stats.unread > 0 ? 'warn' : undefined} icon={<Clock className="w-4 h-4" />} />
        <StatCard label="Críticos / Altos" value={stats.critical} tone={stats.critical > 0 ? 'danger' : undefined} icon={<ShieldAlert className="w-4 h-4" />} />
        <StatCard label="Com replay disponível" value={stats.replayable} tone="ok" icon={<PlayCircle className="w-4 h-4" />} />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por mensagem, câmera ou tipo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={cameraFilter} onValueChange={setCameraFilter}>
          <SelectTrigger className="w-48">
            <CameraIcon className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Câmera" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as câmeras</SelectItem>
            {cameras.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="w-44">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Severidade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas severidades</SelectItem>
            <SelectItem value="critical">Crítico</SelectItem>
            <SelectItem value="high">Alto</SelectItem>
            <SelectItem value="medium">Médio</SelectItem>
            <SelectItem value="low">Baixo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Layout: timeline + player */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <CheckCircle2 className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="font-semibold text-lg">Nenhum alerta encontrado</h3>
            <p className="text-muted-foreground text-sm mt-1">
              Tente ajustar os filtros ou aguarde novos eventos.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid lg:grid-cols-[380px_1fr] gap-4 items-start">
          {/* Timeline lateral */}
          <Card className="overflow-hidden">
            <div className="p-3 border-b border-border bg-muted/30">
              <h2 className="font-semibold text-sm">Eventos ({filtered.length})</h2>
            </div>
            <ScrollArea className="h-[600px]">
              <div className="relative pl-4 pr-2 py-3">
                <div className="absolute left-[18px] top-3 bottom-3 w-px bg-border" aria-hidden />
                <div className="space-y-2">
                  {filtered.map((alert) => {
                    const sev = SEVERITY_STYLES[alert.severity] ?? SEVERITY_STYLES.medium!;
                    const isSelected = alert.id === selectedId;
                    const replayAvailable = alert.camera_id ? hasFramesFor(alert.camera_id) : false;
                    return (
                      <button
                        key={alert.id}
                        type="button"
                        onClick={() => setSelectedId(alert.id)}
                        className={cn(
                          'relative w-full text-left pl-6 pr-3 py-2.5 rounded-lg transition-all',
                          'hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                          isSelected && 'bg-primary/10 ring-2 ring-primary/40',
                        )}
                        aria-pressed={isSelected}
                      >
                        <span
                          className={cn(
                            'absolute left-[3px] top-3.5 w-2.5 h-2.5 rounded-full ring-2 ring-background',
                            sev.dot,
                          )}
                          aria-hidden
                        />
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-medium text-sm leading-tight line-clamp-2">{alert.message}</p>
                          {replayAvailable && (
                            <PlayCircle className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" aria-label="Replay disponível" />
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                          <Badge variant="outline" className={cn('h-5 px-1.5 text-[10px] uppercase', sev.text)}>
                            {sev.label}
                          </Badge>
                          <span className="truncate">{alert.camera_name}</span>
                        </div>
                        <div className="text-[11px] text-muted-foreground/80 mt-0.5">
                          {formatDistanceToNow(new Date(alert.timestamp), { addSuffix: true, locale: ptBR })}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </ScrollArea>
          </Card>

          {/* Player + detalhes */}
          <div className="space-y-4">
            {selected ? (
              <>
                <AlertReplayPlayer
                  cameraId={selected.camera_id ?? ''}
                  cameraName={selected.camera_name}
                  eventTime={selected.timestamp}
                  severity={selected.severity}
                />

                <Card>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <h3 className="font-semibold text-base flex items-center gap-2">
                          <AlertTriangle className={cn('w-4 h-4', SEVERITY_STYLES[selected.severity]?.text)} />
                          {selected.message}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(selected.timestamp), "dd 'de' MMMM 'às' HH:mm:ss", { locale: ptBR })}
                        </p>
                      </div>
                      <Badge variant={selected.is_read ? 'outline' : 'default'}>
                        {selected.is_read ? 'Lido' : 'Não lido'}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <DetailRow label="Câmera" value={selected.camera_name} />
                      <DetailRow label="Tipo" value={selected.type} />
                      <DetailRow label="Severidade" value={SEVERITY_STYLES[selected.severity]?.label ?? selected.severity} />
                      <DetailRow
                        label="Replay"
                        value={selected.camera_id && hasFramesFor(selected.camera_id) ? 'Disponível' : 'Sem buffer'}
                      />
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="p-12 text-center text-muted-foreground">
                  Selecione um alerta na linha do tempo para ver o replay.
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone?: 'ok' | 'warn' | 'danger';
}) {
  const toneClass =
    tone === 'danger' ? 'text-destructive' : tone === 'warn' ? 'text-warning' : tone === 'ok' ? 'text-success' : 'text-foreground';
  return (
    <Card>
      <CardContent className="p-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
          <p className={cn('text-2xl font-bold mt-1 tabular-nums', toneClass)}>{value}</p>
        </div>
        <div className={cn('w-9 h-9 rounded-full bg-muted flex items-center justify-center', toneClass)}>
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-muted-foreground uppercase text-[10px] tracking-wide">{label}</p>
      <p className="font-medium text-foreground mt-0.5 capitalize truncate">{value}</p>
    </div>
  );
}
