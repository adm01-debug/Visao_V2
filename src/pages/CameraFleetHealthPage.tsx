/**
 * CameraFleetHealthPage — Painel de status e saúde de toda a frota de câmeras
 * em tempo real (suporta 60+ câmeras). Assinatura Realtime em camera_health_state
 * + cameras. KPIs agregados, filtros, e grid denso de tiles.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Activity, AlertTriangle, CheckCircle2, ExternalLink, Filter,
  Gauge, HelpCircle, Loader2, RefreshCw, Search, Signal, Video, WifiOff,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { PageMeta } from '@/components/PageMeta';
import { PageContent } from '@/components/layout/MainLayout';
import { AgentHealingTrailCard } from '@/components/admin/AgentHealingTrailCard';
import { ArbiterInvariantsCard } from '@/components/admin/ArbiterInvariantsCard';

import { cn } from '@/lib/utils';

type HealthState = 'online' | 'degraded' | 'offline' | 'unknown';
type FilterState = HealthState | 'all';

interface HealthRow {
  camera_id: string;
  state: HealthState;
  consecutive_failures: number;
  consecutive_successes: number;
  last_check_at: string | null;
  last_state_change_at: string;
  last_latency_ms: number | null;
  last_http_code: number | null;
  last_message: string | null;
}

interface CameraRow {
  id: string;
  name: string;
  location: string | null;
  status: string | null;
}

interface FleetItem extends HealthRow {
  name: string;
  location: string | null;
  camera_status: string | null;
}

const STATE_META: Record<HealthState, { label: string; className: string; dot: string; Icon: typeof CheckCircle2 }> = {
  online:   { label: 'Online',    className: 'bg-success/15 text-success border-success/30',           dot: 'bg-success',     Icon: CheckCircle2 },
  degraded: { label: 'Instável',  className: 'bg-warning/15 text-warning border-warning/30',           dot: 'bg-warning',     Icon: AlertTriangle },
  offline:  { label: 'Offline',   className: 'bg-destructive/15 text-destructive border-destructive/30', dot: 'bg-destructive', Icon: WifiOff },
  unknown:  { label: 'Sem dados', className: 'bg-muted text-muted-foreground border-border',           dot: 'bg-muted-foreground', Icon: HelpCircle },
};

export default function CameraFleetHealthPage() {
  const { user } = useAuth();
  const [cameras, setCameras] = useState<Map<string, CameraRow>>(new Map());
  const [healthMap, setHealthMap] = useState<Map<string, HealthRow>>(new Map());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [probing, setProbing] = useState(false);
  const [filter, setFilter] = useState<FilterState>('all');
  const [search, setSearch] = useState('');
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const uidRef = useRef(Date.now());

  const loadAll = useCallback(async () => {
    if (!user) return;
    setRefreshing(true);
    try {
      const [{ data: camData, error: camErr }, { data: healthData, error: healthErr }] = await Promise.all([
        supabase.from('cameras').select('id, name, location, status').order('name'),
        supabase
          .from('camera_health_state')
          .select('camera_id, state, consecutive_failures, consecutive_successes, last_check_at, last_state_change_at, last_latency_ms, last_http_code, last_message'),
      ]);
      if (camErr) throw camErr;
      if (healthErr) throw healthErr;
      const cm = new Map<string, CameraRow>();
      (camData ?? []).forEach((c) => cm.set(c.id, c as CameraRow));
      const hm = new Map<string, HealthRow>();
      (healthData ?? []).forEach((h) => hm.set(h.camera_id, h as HealthRow));
      setCameras(cm);
      setHealthMap(hm);
      setLastUpdate(new Date());
    } catch (e) {
      toast.error(`Falha ao carregar frota: ${(e as Error).message}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => { void loadAll(); }, [loadAll]);

  // Realtime: camera_health_state + cameras
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`fleet-health-${uidRef.current}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'camera_health_state' }, (payload) => {
        setHealthMap((prev) => {
          const next = new Map(prev);
          if (payload.eventType === 'DELETE') {
            const oldId = (payload.old as { camera_id?: string })?.camera_id;
            if (oldId) next.delete(oldId);
          } else {
            const row = payload.new as HealthRow;
            if (row?.camera_id) next.set(row.camera_id, row);
          }
          return next;
        });
        setLastUpdate(new Date());
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cameras' }, (payload) => {
        setCameras((prev) => {
          const next = new Map(prev);
          if (payload.eventType === 'DELETE') {
            const oldId = (payload.old as { id?: string })?.id;
            if (oldId) next.delete(oldId);
          } else {
            const row = payload.new as CameraRow;
            if (row?.id) next.set(row.id, row);
          }
          return next;
        });
        setLastUpdate(new Date());
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user]);

  const items: FleetItem[] = useMemo(() => {
    const list: FleetItem[] = [];
    cameras.forEach((cam) => {
      const h = healthMap.get(cam.id);
      list.push({
        camera_id: cam.id,
        name: cam.name,
        location: cam.location,
        camera_status: cam.status,
        state: (h?.state ?? 'unknown') as HealthState,
        consecutive_failures: h?.consecutive_failures ?? 0,
        consecutive_successes: h?.consecutive_successes ?? 0,
        last_check_at: h?.last_check_at ?? null,
        last_state_change_at: h?.last_state_change_at ?? '',
        last_latency_ms: h?.last_latency_ms ?? null,
        last_http_code: h?.last_http_code ?? null,
        last_message: h?.last_message ?? null,
      });
    });
    return list.sort((a, b) => {
      const order: HealthState[] = ['offline', 'degraded', 'unknown', 'online'];
      const diff = order.indexOf(a.state) - order.indexOf(b.state);
      if (diff !== 0) return diff;
      return a.name.localeCompare(b.name, 'pt-BR');
    });
  }, [cameras, healthMap]);

  const summary = useMemo(() => {
    const s = { total: items.length, online: 0, degraded: 0, offline: 0, unknown: 0, avgLatency: 0 };
    let latencySum = 0;
    let latencyCount = 0;
    items.forEach((i) => {
      s[i.state] += 1;
      if (i.state === 'online' && i.last_latency_ms != null) {
        latencySum += i.last_latency_ms;
        latencyCount += 1;
      }
    });
    s.avgLatency = latencyCount ? Math.round(latencySum / latencyCount) : 0;
    return s;
  }, [items]);

  const uptimePct = summary.total > 0 ? Math.round((summary.online / summary.total) * 100) : 0;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((i) => {
      if (filter !== 'all' && i.state !== filter) return false;
      if (!q) return true;
      return (
        i.name.toLowerCase().includes(q) ||
        (i.location?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [items, filter, search]);

  const runProbe = async () => {
    setProbing(true);
    try {
      await supabase.functions.invoke('stream-health-probe', { body: { ts: new Date().toISOString() } });
      await new Promise((r) => setTimeout(r, 1500));
      await supabase.functions.invoke('camera-health-monitor', { body: { ts: new Date().toISOString() } });
      toast.success('Sondagem executada. Atualizando painel…');
      await loadAll();
    } catch (e) {
      toast.error(`Falha na sondagem: ${(e as Error).message}`);
    } finally {
      setProbing(false);
    }
  };

  return (
    <PageContent>
      <PageMeta
        title="Painel de Saúde da Frota · VISÃO"
        description="Status e saúde de todas as câmeras em tempo real: online, instáveis e offline com latência média e uptime."
      />

      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Activity className="h-6 w-6 text-primary" /> Painel de Saúde da Frota
          </h1>
          <p className="text-sm text-muted-foreground">
            Atualização em tempo real · última sincronização{' '}
            {formatDistanceToNow(lastUpdate, { addSuffix: true, locale: ptBR })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => void loadAll()} disabled={refreshing}>
            <RefreshCw className={cn('mr-1 h-4 w-4', refreshing && 'animate-spin')} /> Atualizar
          </Button>
          <Button size="sm" onClick={() => void runProbe()} disabled={probing}>
            {probing ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Signal className="mr-1 h-4 w-4" />}
            Sondar agora
          </Button>
        </div>
      </header>

      {/* KPIs */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        <KpiCard title="Câmeras" value={summary.total} Icon={Video} tone="text-foreground" />
        <KpiCard title="Online" value={summary.online} Icon={CheckCircle2} tone="text-success" />
        <KpiCard title="Instáveis" value={summary.degraded} Icon={AlertTriangle} tone="text-warning" />
        <KpiCard title="Offline" value={summary.offline} Icon={WifiOff} tone="text-destructive" />
        <KpiCard title="Uptime" value={`${uptimePct}%`} Icon={Gauge} tone={uptimePct >= 90 ? 'text-success' : uptimePct >= 70 ? 'text-warning' : 'text-destructive'} />
        <KpiCard title="Latência média" value={summary.avgLatency ? `${summary.avgLatency} ms` : '—'} Icon={Activity} tone="text-foreground" />
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome ou localização…"
            className="pl-9"
          />
        </div>
        <ToggleGroup
          type="single"
          value={filter}
          onValueChange={(v) => v && setFilter(v as FilterState)}
          variant="outline"
          size="sm"
        >
          <ToggleGroupItem value="all"><Filter className="mr-1 h-3.5 w-3.5" />Todos</ToggleGroupItem>
          <ToggleGroupItem value="online" className="data-[state=on]:bg-success/15 data-[state=on]:text-success">Online</ToggleGroupItem>
          <ToggleGroupItem value="degraded" className="data-[state=on]:bg-warning/15 data-[state=on]:text-warning">Instáveis</ToggleGroupItem>
          <ToggleGroupItem value="offline" className="data-[state=on]:bg-destructive/15 data-[state=on]:text-destructive">Offline</ToggleGroupItem>
          <ToggleGroupItem value="unknown">Sem dados</ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Nenhuma câmera corresponde aos filtros atuais.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((item) => <FleetTile key={item.camera_id} item={item} />)}
        </div>
      )}

      {/* Onda 140 — decisão de NÃO agir dos agentes locais, com o motivo do veto. */}
      <AgentHealingTrailCard />

      {/* Onda 142 — as 4 invariantes estruturais do árbitro, verificadas em produção. */}
      <ArbiterInvariantsCard />
    </PageContent>
  );
}


interface KpiCardProps {
  title: string;
  value: number | string;
  Icon: typeof CheckCircle2;
  tone: string;
}

function KpiCard({ title, value, Icon, tone }: KpiCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <Icon className="h-3.5 w-3.5" /> {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className={cn('text-2xl font-bold tabular-nums', tone)}>{value}</p>
      </CardContent>
    </Card>
  );
}

function FleetTile({ item }: { item: FleetItem }) {
  const meta = STATE_META[item.state];
  const Icon = meta.Icon;
  return (
    <Card className="transition-colors hover:border-primary/40">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className={cn('h-2 w-2 rounded-full', meta.dot, item.state === 'online' && 'animate-pulse')} aria-hidden />
              <h3 className="truncate text-sm font-semibold">{item.name}</h3>
            </div>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {item.location ?? 'Sem localização'}
            </p>
          </div>
          <Badge variant="outline" className={cn('gap-1 shrink-0', meta.className)}>
            <Icon className="h-3 w-3" /> {meta.label}
          </Badge>
        </div>

        <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
          <dt className="text-muted-foreground">Latência</dt>
          <dd className="text-right tabular-nums">
            {item.last_latency_ms != null ? `${item.last_latency_ms} ms` : '—'}
          </dd>
          <dt className="text-muted-foreground">Verificação</dt>
          <dd className="text-right">
            {item.last_check_at
              ? formatDistanceToNow(new Date(item.last_check_at), { addSuffix: true, locale: ptBR })
              : '—'}
          </dd>
          {item.state === 'offline' && (
            <>
              <dt className="text-muted-foreground">Falhas seguidas</dt>
              <dd className="text-right tabular-nums text-destructive">{item.consecutive_failures}</dd>
            </>
          )}
          {item.state === 'degraded' && item.last_http_code != null && (
            <>
              <dt className="text-muted-foreground">HTTP</dt>
              <dd className="text-right tabular-nums">{item.last_http_code}</dd>
            </>
          )}
        </dl>

        {item.state !== 'online' && item.last_message && (
          <p className="mt-2 line-clamp-2 rounded bg-muted/50 px-2 py-1 text-xs text-muted-foreground">
            {item.last_message}
          </p>
        )}

        <div className="mt-3 flex justify-end">
          <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
            <Link to={`/cameras/${item.camera_id}/status`}>
              Detalhes <ExternalLink className="ml-1 h-3 w-3" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
