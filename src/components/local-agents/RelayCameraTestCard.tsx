import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { useActiveRelayAgents } from '@/hooks/useActiveRelayAgents';
import { readFunctionErrorBody } from '@/lib/edgeFunctionErrors';
import { isPrivateIP } from '@/lib/ipUtils';
import { toast } from 'sonner';
import { PlayCircle, Loader2, CheckCircle2, XCircle, Radar } from 'lucide-react';

interface CameraRow {
  id: string;
  name: string;
  location: string;
  stream_url: string | null;
  host: string | null;
}

type TestStatus = 'idle' | 'running' | 'ok' | 'warn' | 'fail';

interface CameraTestResult {
  status: TestStatus;
  probe?: { open: number[]; onvif: number[]; error?: string };
  onvif?: { endpoints: number; manufacturer?: string | null; error?: string; errorCode?: string };
  startedAt?: number;
  finishedAt?: number;
}

function extractHost(url: string | null): string | null {
  if (!url) return null;
  try {
    // rtsp://user:pass@host:port/path — new URL exige protocolo web; normaliza
    const normalized = url.replace(/^rtsp:\/\//i, 'http://').replace(/^rtsps:\/\//i, 'https://');
    const u = new URL(normalized);
    return u.hostname || null;
  } catch {
    const m = /@([^/:]+)/.exec(url) ?? /:\/\/([^/:]+)/.exec(url);
    return m?.[1] ?? null;
  }
}

const CONCURRENCY = 4;

export function RelayCameraTestCard() {
  const relayAgents = useActiveRelayAgents();
  const [relayId, setRelayId] = useState<string>('');
  const [results, setResults] = useState<Record<string, CameraTestResult>>({});
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);

  const camerasQuery = useQuery({
    queryKey: ['relay-test-cameras'],
    queryFn: async (): Promise<CameraRow[]> => {
      const { data, error } = await supabase
        .from('cameras')
        .select('id, name, location, stream_url')
        .order('name');
      if (error) throw error;
      return (data ?? []).map((c) => ({ ...c, host: extractHost(c.stream_url) }));
    },
  });

  const testable = useMemo(
    () => (camerasQuery.data ?? []).filter((c) => !!c.host),
    [camerasQuery.data]
  );

  async function runFor(camera: CameraRow, agentId: string) {
    setResults((r) => ({ ...r, [camera.id]: { status: 'running', startedAt: Date.now() } }));

    const host = camera.host!;
    const isLan = isPrivateIP(host);
    const useRelay = !!agentId;

    if (isLan && !useRelay) {
      setResults((r) => ({
        ...r,
        [camera.id]: {
          status: 'fail',
          probe: { open: [], onvif: [], error: 'IP privado exige agente local' },
          onvif: {
            endpoints: 0,
            error: 'IP privado exige agente local',
            errorCode: 'private_host_blocked',
          },
          finishedAt: Date.now(),
          startedAt: results[camera.id]?.startedAt ?? Date.now(),
        },
      }));
      return;
    }

    const partial: CameraTestResult = { status: 'running', startedAt: Date.now() };

    // 1) Port probe
    try {
      const { data, error } = await supabase.functions.invoke('camera-port-probe', {
        body: {
          host,
          allow_private: isLan,
          ...(useRelay ? { relay_agent_id: agentId } : {}),
        },
      });
      const payload =
        (data as Record<string, any> | null) ?? (error ? await readFunctionErrorBody(error) : null);
      if (payload?.error) {
        partial.probe = {
          open: [],
          onvif: [],
          error: (payload.hint as string) || String(payload.error),
        };
      } else {
        const results: Array<{ port: number; open: boolean; kind?: string }> =
          payload?.results ?? [];
        partial.probe = {
          open: results.filter((p) => p.open).map((p) => p.port),
          onvif: payload?.summary?.suggested_onvif ?? [],
        };
      }
    } catch (e) {
      partial.probe = { open: [], onvif: [], error: e instanceof Error ? e.message : String(e) };
    }

    // 2) ONVIF autodiscover (só se probe achou algo ONVIF ou se probe falhou por rede)
    try {
      const ports = partial.probe?.onvif?.length ? partial.probe.onvif : undefined;
      const { data, error } = await supabase.functions.invoke('onvif-autodiscover', {
        body: {
          host,
          allow_private: isLan,
          ...(ports ? { ports } : {}),
          ...(useRelay ? { relay_agent_id: agentId } : {}),
        },
      });
      const payload =
        (data as Record<string, any> | null) ?? (error ? await readFunctionErrorBody(error) : null);
      if (payload?.error) {
        partial.onvif = {
          endpoints: 0,
          error: (payload.hint as string) || String(payload.error),
          errorCode: String(payload.error_code ?? payload.error),
        };
      } else {
        const endpoints: unknown[] = payload?.endpoints ?? payload?.candidates ?? [];
        partial.onvif = {
          endpoints: Array.isArray(endpoints) ? endpoints.length : 0,
          manufacturer: payload?.device?.manufacturer ?? null,
        };
      }
    } catch (e) {
      partial.onvif = { endpoints: 0, error: e instanceof Error ? e.message : String(e) };
    }

    const probeOk = (partial.probe?.open?.length ?? 0) > 0 && !partial.probe?.error;
    const onvifOk = (partial.onvif?.endpoints ?? 0) > 0;
    const status: TestStatus = onvifOk ? 'ok' : probeOk ? 'warn' : 'fail';

    setResults((r) => ({
      ...r,
      [camera.id]: { ...partial, status, finishedAt: Date.now() },
    }));
  }

  async function runAll() {
    if (running || testable.length === 0) return;
    setRunning(true);
    setProgress(0);
    setResults({});

    let done = 0;
    const queue = [...testable];
    const workers = Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
      while (queue.length > 0) {
        const cam = queue.shift();
        if (!cam) return;
        await runFor(cam, relayId);
        done += 1;
        setProgress(Math.round((done / testable.length) * 100));
      }
    });
    await Promise.all(workers);
    setRunning(false);
    toast.success(`Teste concluído: ${done}/${testable.length} câmeras avaliadas.`);
  }

  function badge(status: TestStatus) {
    switch (status) {
      case 'running':
        return (
          <Badge variant="secondary" className="gap-1">
            <Loader2 className="w-3 h-3 animate-spin" /> Testando
          </Badge>
        );
      case 'ok':
        return (
          <Badge className="gap-1 bg-success hover:bg-success">
            <CheckCircle2 className="w-3 h-3" /> OK
          </Badge>
        );
      case 'warn':
        return (
          <Badge variant="secondary" className="gap-1">
            <Radar className="w-3 h-3" /> Parcial
          </Badge>
        );
      case 'fail':
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="w-3 h-3" /> Falha
          </Badge>
        );
      default:
        return <Badge variant="outline">—</Badge>;
    }
  }

  const summary = useMemo(() => {
    const values = Object.values(results);
    return {
      ok: values.filter((v) => v.status === 'ok').length,
      warn: values.filter((v) => v.status === 'warn').length,
      fail: values.filter((v) => v.status === 'fail').length,
      total: testable.length,
    };
  }, [results, testable.length]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Radar className="w-5 h-5 text-primary" />
          Teste de alcance por câmera
        </CardTitle>
        <CardDescription>
          Executa <code>port-probe</code> + <code>onvif-autodiscover</code> em cada câmera usando o
          Agente Local selecionado. Ideal para validar cobertura após instalar um relé.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-end gap-3">
          <div className="flex-1">
            <label className="text-sm font-medium mb-1 block">Agente Local (relé)</label>
            <Select
              value={relayId || '__direct__'}
              onValueChange={(v) => setRelayId(v === '__direct__' ? '' : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sem relé (direto)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__direct__">Sem relé — direto da nuvem</SelectItem>
                {(relayAgents.data ?? []).map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name} {a.network_cidr ? `(${a.network_cidr})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={runAll} disabled={running || testable.length === 0} className="gap-2">
            {running ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <PlayCircle className="w-4 h-4" />
            )}
            Testar {testable.length} câmera(s)
          </Button>
        </div>

        {running && <Progress value={progress} className="h-2" />}

        {summary.total > 0 && (
          <div className="flex gap-2 text-sm">
            <Badge className="bg-success hover:bg-success">OK: {summary.ok}</Badge>
            <Badge variant="secondary">Parcial: {summary.warn}</Badge>
            <Badge variant="destructive">Falha: {summary.fail}</Badge>
            <Badge variant="outline">Total: {summary.total}</Badge>
          </div>
        )}

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Câmera</TableHead>
              <TableHead>Host</TableHead>
              <TableHead>Portas abertas</TableHead>
              <TableHead>ONVIF</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(camerasQuery.data ?? []).map((cam) => {
              const r = results[cam.id];
              return (
                <TableRow key={cam.id}>
                  <TableCell>
                    <div className="font-medium">{cam.name}</div>
                    <div className="text-xs text-muted-foreground">{cam.location}</div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {cam.host ?? <span className="text-muted-foreground">sem stream_url</span>}
                    {cam.host && isPrivateIP(cam.host) && (
                      <Badge variant="outline" className="ml-2 text-[10px]">
                        LAN
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-xs">
                    {r?.probe?.error ? (
                      <span className="text-destructive">{r.probe.error}</span>
                    ) : r?.probe ? (
                      r.probe.open.length ? (
                        r.probe.open.join(', ')
                      ) : (
                        '—'
                      )
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell className="text-xs">
                    {r?.onvif?.error ? (
                      <span className="text-destructive" title={r.onvif.errorCode}>
                        {r.onvif.error}
                      </span>
                    ) : r?.onvif ? (
                      <>
                        {r.onvif.endpoints} endpoint(s)
                        {r.onvif.manufacturer ? ` · ${r.onvif.manufacturer}` : ''}
                      </>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell>{badge(r?.status ?? 'idle')}</TableCell>
                </TableRow>
              );
            })}
            {camerasQuery.data && camerasQuery.data.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                  Nenhuma câmera cadastrada.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
