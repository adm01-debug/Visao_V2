/**
 * CameraStatusPage — Tela dedicada de status da câmera.
 * Exibe: última conexão, qualidade do stream e logs básicos de falhas.
 */
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Activity, ArrowLeft, Camera as CameraIcon, CheckCircle2, Loader2,
  RotateCcw, ShieldAlert, TrendingUp, Wifi, WifiOff,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PageMeta } from '@/components/PageMeta';
import { useStreamHealth, type HealthCheck, type RestartEvent } from '@/hooks/useStreamHealth';
import { cn } from '@/lib/utils';

interface CameraRow {
  id: string;
  name: string;
  location: string | null;
  status: 'online' | 'offline' | 'alert' | 'warning' | null;
  last_activity: string | null;
  updated_at: string | null;
  stream_url: string | null;
}

function statusTone(status: CameraRow['status']) {
  switch (status) {
    case 'online':
      return { label: 'Online', className: 'bg-success/15 text-success border-success/30', icon: Wifi };
    case 'alert':
      return { label: 'Em alerta', className: 'bg-destructive/15 text-destructive border-destructive/30', icon: ShieldAlert };
    case 'warning':
      return { label: 'Instável', className: 'bg-warning/15 text-warning border-warning/30', icon: Activity };
    default:
      return { label: 'Offline', className: 'bg-muted text-muted-foreground border-border', icon: WifiOff };
  }
}

function qualityFrom(checks: HealthCheck[]) {
  if (checks.length === 0) {
    return { score: null as number | null, label: 'Sem dados', tone: 'text-muted-foreground', avgLatency: null as number | null };
  }
  const oks = checks.filter((c) => c.status === 'ok');
  const successRate = oks.length / checks.length;
  const latencies = oks.map((c) => c.latency_ms ?? 0).filter((n) => n > 0);
  const avgLatency = latencies.length ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : null;
  // Score 0..100 pondera 70% sucesso + 30% latência (<300ms ideal, >1500ms zero)
  const latScore = avgLatency == null ? 60 : Math.max(0, Math.min(100, 100 - (avgLatency - 300) / 12));
  const score = Math.round(successRate * 70 + latScore * 0.3);
  const tone =
    score >= 85 ? 'text-success' : score >= 60 ? 'text-warning' : 'text-destructive';
  const label = score >= 85 ? 'Excelente' : score >= 60 ? 'Aceitável' : 'Degradada';
  return { score, label, tone, avgLatency };
}

export default function CameraStatusPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { checks, restarts, loading: healthLoading, reload, triggerManualRestart } = useStreamHealth();
  const [camera, setCamera] = useState<CameraRow | null>(null);
  const [loadingCamera, setLoadingCamera] = useState(true);

  useEffect(() => {
    let active = true;
    async function fetchCamera() {
      if (!id || !user) return;
      setLoadingCamera(true);
      const { data } = await supabase
        .from('cameras')
        .select('id, name, location, status, last_activity, updated_at, stream_url')
        .eq('id', id)
        .maybeSingle();
      if (active) {
        setCamera(data as CameraRow | null);
        setLoadingCamera(false);
      }
    }
    void fetchCamera();
    return () => {
      active = false;
    };
  }, [id, user]);

  const cameraChecks = useMemo(
    () => checks.filter((c) => c.camera_id === id).slice(0, 50),
    [checks, id],
  );
  const cameraRestarts = useMemo(
    () => restarts.filter((r) => r.camera_id === id).slice(0, 20),
    [restarts, id],
  );
  const failures = useMemo(
    () => cameraChecks.filter((c) => c.status === 'fail').slice(0, 25),
    [cameraChecks],
  );
  const lastOk = useMemo(() => cameraChecks.find((c) => c.status === 'ok'), [cameraChecks]);
  const quality = useMemo(() => qualityFrom(cameraChecks), [cameraChecks]);
  const tone = statusTone(camera?.status ?? 'offline');
  const StatusIcon = tone.icon;

  const lastConnectionAt = lastOk?.created_at ?? camera?.last_activity ?? camera?.updated_at ?? null;

  return (
    <PageContent>
      <PageMeta
        title={camera ? `Status — ${camera.name} · VISÃO` : 'Status da câmera · VISÃO'}
        description="Status detalhado da câmera: última conexão, qualidade do stream e logs de falhas."
      />

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <Button asChild variant="ghost" size="sm" className="-ml-2 h-8">
            <Link to="/cameras">
              <ArrowLeft className="mr-1 h-4 w-4" /> Câmeras
            </Link>
          </Button>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <CameraIcon className="h-6 w-6" />
            {loadingCamera ? 'Carregando…' : camera?.name ?? 'Câmera não encontrada'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {camera?.location ?? 'Sem localização definida'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className={cn('gap-1 border', tone.className)}>
            <StatusIcon className="h-3.5 w-3.5" /> {tone.label}
          </Badge>
          <Button variant="outline" size="sm" onClick={() => void reload()} disabled={healthLoading}>
            {healthLoading ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
            Atualizar
          </Button>
          {id ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void triggerManualRestart(id)}
              disabled={healthLoading}
            >
              <RotateCcw className="mr-1 h-4 w-4" /> Reiniciar stream
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <CheckCircle2 className="h-4 w-4" /> Última conexão
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lastConnectionAt ? (
              <>
                <p className="text-xl font-semibold">
                  {formatDistanceToNow(new Date(lastConnectionAt), { addSuffix: true, locale: ptBR })}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {new Date(lastConnectionAt).toLocaleString('pt-BR')}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Ainda sem registros de conexão.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <TrendingUp className="h-4 w-4" /> Qualidade do stream
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={cn('text-3xl font-bold', quality.tone)}>
              {quality.score == null ? '—' : `${quality.score}/100`}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {quality.label} · janela de {cameraChecks.length} checks
              {quality.avgLatency != null ? ` · latência média ${quality.avgLatency} ms` : ''}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <ShieldAlert className="h-4 w-4" /> Falhas recentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{failures.length}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {cameraRestarts.length} restart{cameraRestarts.length === 1 ? '' : 's'} registrado
              {cameraRestarts.length === 1 ? '' : 's'}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Logs de falhas</CardTitle>
        </CardHeader>
        <CardContent>
          {healthLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando checks…
            </div>
          ) : failures.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma falha registrada na janela recente. Tudo em ordem.
            </p>
          ) : (
            <ScrollArea className="max-h-[360px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Quando</TableHead>
                    <TableHead>HTTP</TableHead>
                    <TableHead>Latência</TableHead>
                    <TableHead>Mensagem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {failures.map((f) => (
                    <TableRow key={f.id}>
                      <TableCell className="whitespace-nowrap text-xs">
                        {new Date(f.created_at).toLocaleString('pt-BR')}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-destructive/30 text-destructive">
                          {f.http_code ?? '—'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        {f.latency_ms != null ? `${f.latency_ms} ms` : '—'}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {f.message ?? 'Sem detalhes'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {cameraRestarts.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Eventos de restart</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quando</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead>Tentativa</TableHead>
                  <TableHead>Resultado</TableHead>
                  <TableHead>Motivo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cameraRestarts.map((r: RestartEvent) => (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap text-xs">
                      {new Date(r.created_at).toLocaleString('pt-BR')}
                    </TableCell>
                    <TableCell className="text-xs capitalize">{r.triggered_by}</TableCell>
                    <TableCell className="text-xs">#{r.attempt}</TableCell>
                    <TableCell>
                      {r.succeeded == null ? (
                        <Badge variant="outline">Em curso</Badge>
                      ) : r.succeeded ? (
                        <Badge className="bg-success/15 text-success border-success/30" variant="outline">
                          Sucesso
                        </Badge>
                      ) : (
                        <Badge className="bg-destructive/15 text-destructive border-destructive/30" variant="outline">
                          Falha
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{r.reason}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}
    </PageContent>
  );
}
