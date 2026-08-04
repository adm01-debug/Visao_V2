/**
 * VISÃO — Downloads sincronizados de gravações do NVR.
 *
 * Fluxo:
 *  1. Usuário escolhe intervalo [start, end] e um conjunto de câmeras
 *     (agrupadas por NVR). Só câmeras com `nvr_id` participam.
 *  2. Para cada NVR envolvido, o app pede as credenciais HTTP-CGI
 *     (não persistidas, ficam em memória durante a sessão).
 *  3. Um job de download é criado por câmera na tabela
 *     `nvr_recording_downloads` e disparado em paralelo na Edge Function
 *     `nvr-recording-download` (action=download).
 *  4. Progresso, retry e cancelamento são refletidos via Realtime.
 */
import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  CalendarIcon,
  Download,
  History as HistoryIcon,
  Layers,
  PlayCircle,
  RefreshCw,
} from 'lucide-react';
import { Link } from 'react-router-dom';

import { supabase } from '@/integrations/supabase/client';
import { useCameras } from '@/hooks/useCameras';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { PageMeta } from '@/components/PageMeta';
import { PageContent } from '@/components/layout/MainLayout';
import {
  NvrCredentialsDialog,
  type NvrCreds,
} from '@/components/nvr-downloads/NvrCredentialsDialog';
import { NvrDownloadJobRow, type DownloadRow } from '@/components/nvr-downloads/NvrDownloadJobRow';
import { toast } from 'sonner';

type NvrLite = { id: string; name: string; host: string };

function combineDateTime(date: Date, time: string): Date {
  const parts = time.split(':').map((n) => Number(n));
  const h = parts[0] ?? 0;
  const m = parts[1] ?? 0;
  const d = new Date(date);
  d.setHours(Number.isFinite(h) ? h : 0, Number.isFinite(m) ? m : 0, 0, 0);
  return d;
}

function DateTimeField({
  label,
  date,
  time,
  onDateChange,
  onTimeChange,
}: {
  label: string;
  date: Date | undefined;
  time: string;
  onDateChange: (d: Date | undefined) => void;
  onTimeChange: (t: string) => void;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      <div className="flex gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'flex-1 justify-start text-left font-normal',
                !date && 'text-muted-foreground'
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date ? format(date, 'PPP', { locale: ptBR }) : 'Escolher data'}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-auto p-0">
            <Calendar
              mode="single"
              selected={date}
              onSelect={onDateChange}
              autoFocus
              className={cn('p-3 pointer-events-auto')}
            />
          </PopoverContent>
        </Popover>
        <Input
          type="time"
          step={1}
          value={time}
          onChange={(e) => onTimeChange(e.target.value)}
          className="w-32"
        />
      </div>
    </div>
  );
}

export default function NvrDownloadsPage() {
  const { cameras, loading: camerasLoading } = useCameras();
  const [nvrs, setNvrs] = useState<NvrLite[]>([]);
  const [selectedCameraIds, setSelectedCameraIds] = useState<Set<string>>(new Set());
  const [startDate, setStartDate] = useState<Date | undefined>(
    () => new Date(Date.now() - 60 * 60 * 1000)
  );
  const [startTime, setStartTime] = useState('00:00');
  const [endDate, setEndDate] = useState<Date | undefined>(() => new Date());
  const [endTime, setEndTime] = useState('00:00');

  const [jobs, setJobs] = useState<DownloadRow[]>([]);
  const [pendingCredsNvr, setPendingCredsNvr] = useState<NvrLite | null>(null);
  const [nvrCreds, setNvrCreds] = useState<Record<string, NvrCreds>>({});
  const [starting, setStarting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // NVR-based cameras only
  const nvrCameras = useMemo(
    () =>
      cameras.filter(
        (c) => c.nvr_id && c.channel_number !== null && c.channel_number !== undefined
      ),
    [cameras]
  );

  const camerasByNvr = useMemo(() => {
    const map: Record<string, typeof nvrCameras> = {};
    for (const c of nvrCameras) {
      const key = c.nvr_id ?? '';
      (map[key] ??= []).push(c);
    }
    return map;
  }, [nvrCameras]);

  useEffect(() => {
    void supabase
      .from('nvrs')
      .select('id, name, host')
      .then(({ data }) => setNvrs((data ?? []) as NvrLite[]));
  }, []);

  const loadJobs = async () => {
    setRefreshing(true);
    try {
      const { data, error } = await supabase
        .from('nvr_recording_downloads')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      setJobs((data ?? []) as unknown as DownloadRow[]);
    } catch (e) {
      toast.error('Falha ao carregar histórico de downloads.');
      if (import.meta.env.DEV) console.error(e);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadJobs();
    const channel = supabase
      .channel(`nvr-downloads-${Date.now()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'nvr_recording_downloads' },
        (payload) => {
          setJobs((prev) => {
            const next = [...prev];
            const row = (payload.new ?? payload.old) as DownloadRow;
            if (!row?.id) return prev;
            if (payload.eventType === 'DELETE') return prev.filter((j) => j.id !== row.id);
            const idx = next.findIndex((j) => j.id === row.id);
            if (idx >= 0) next[idx] = { ...next[idx], ...row };
            else next.unshift(row);
            return next;
          });
        }
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  const jobsWithCameraName = useMemo(() => {
    return jobs.map((j) => {
      const cam = cameras.find((c) => c.channel_number === j.channel);
      return { ...j, camera_name: cam?.name };
    });
  }, [jobs, cameras]);

  const toggleCamera = (id: string) => {
    setSelectedCameraIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleNvr = (nvrId: string) => {
    const camIds = (camerasByNvr[nvrId] ?? []).map((c) => c.id);
    const allSelected = camIds.every((id) => selectedCameraIds.has(id));
    setSelectedCameraIds((prev) => {
      const next = new Set(prev);
      for (const id of camIds) {
        if (allSelected) next.delete(id);
        else next.add(id);
      }
      return next;
    });
  };

  const dispatchDownloads = async (creds: Record<string, NvrCreds>) => {
    if (!startDate || !endDate) return;
    const startIso = combineDateTime(startDate, startTime).toISOString();
    const endIso = combineDateTime(endDate, endTime).toISOString();
    if (new Date(endIso) <= new Date(startIso)) {
      toast.error('O fim deve ser posterior ao início.');
      return;
    }

    setStarting(true);
    let ok = 0;
    let fail = 0;
    try {
      const selected = Array.from(selectedCameraIds);
      await Promise.all(
        selected.map(async (id) => {
          const cam = cameras.find((c) => c.id === id);
          if (!cam?.nvr_id || cam.channel_number == null) {
            fail += 1;
            return;
          }
          const nvrCred = creds[cam.nvr_id];
          if (!nvrCred) {
            fail += 1;
            return;
          }
          const { error } = await supabase.functions.invoke('nvr-recording-download', {
            body: {
              action: 'download',
              nvr_id: cam.nvr_id,
              nvr: nvrCred,
              channel: cam.channel_number,
              stream_type: 'main',
              start_time: startIso,
              end_time: endIso,
            },
          });
          if (error) {
            fail += 1;
            if (import.meta.env.DEV) console.error('download error', cam.name, error);
          } else {
            ok += 1;
          }
        })
      );
      if (ok > 0) toast.success(`${ok} download(s) iniciado(s).`);
      if (fail > 0) toast.warning(`${fail} câmera(s) sem credenciais ou com erro.`);
      void loadJobs();
    } finally {
      setStarting(false);
    }
  };

  const handleStart = async () => {
    if (selectedCameraIds.size === 0) {
      toast.warning('Selecione ao menos uma câmera.');
      return;
    }
    const neededNvrIds = new Set<string>();
    for (const camId of selectedCameraIds) {
      const cam = cameras.find((c) => c.id === camId);
      if (cam?.nvr_id) neededNvrIds.add(cam.nvr_id);
    }
    // Pede credenciais faltantes em sequência (via diálogo).
    for (const nvrId of neededNvrIds) {
      if (!nvrCreds[nvrId]) {
        const nvr = nvrs.find((n) => n.id === nvrId);
        if (!nvr) continue;
        setPendingCredsNvr(nvr);
        return; // aguarda diálogo; ao confirmar tenta novamente
      }
    }
    await dispatchDownloads(nvrCreds);
  };

  const handleCredsConfirm = (creds: NvrCreds) => {
    if (!pendingCredsNvr) return;
    const merged = { ...nvrCreds, [pendingCredsNvr.id]: creds };
    setNvrCreds(merged);
    setPendingCredsNvr(null);
    // Re-tenta imediatamente após capturar; se ainda faltar credencial,
    // handleStart abre o próximo diálogo.
    setTimeout(() => void handleStart(), 0);
  };

  const handleRetry = async (row: DownloadRow) => {
    const cam = cameras.find((c) => c.channel_number === row.channel);
    if (!cam?.nvr_id) return;
    const creds = nvrCreds[cam.nvr_id];
    if (!creds) {
      const nvr = nvrs.find((n) => n.id === cam.nvr_id);
      if (nvr) setPendingCredsNvr(nvr);
      toast.info('Informe as credenciais do NVR para tentar novamente.');
      return;
    }
    const { error } = await supabase.functions.invoke('nvr-recording-download', {
      body: { action: 'download', nvr_id: cam.nvr_id, nvr: creds, download_id: row.id },
    });
    if (error) toast.error('Falha ao reagendar download.');
    else toast.success('Download reagendado.');
  };

  const handleCancel = async (id: string) => {
    const { error } = await supabase.functions.invoke('nvr-recording-download', {
      body: { action: 'cancel', download_id: id },
    });
    if (error) toast.error('Não foi possível cancelar.');
    else toast.success('Download cancelado.');
  };

  const handleConvert = async (row: DownloadRow) => {
    const { error } = await supabase.functions.invoke('nvr-recording-convert', {
      body: { action: 'convert', download_id: row.id, force: true },
    });
    if (error) {
      toast.error('Não foi possível iniciar a conversão.');
      if (import.meta.env.DEV) console.error(error);
    } else {
      toast.success('Conversão para MP4 iniciada em segundo plano.');
    }
  };

  return (
    <>
      <PageMeta
        title="Downloads de Gravações | VISÃO"
        description="Selecione intervalo e câmeras e faça download sincronizado das gravações do NVR."
      />
      <PageContent>
        <div className="space-y-6">
          <header className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1">
              <h1 className="flex items-center gap-2 text-2xl font-semibold text-foreground">
                <Download className="h-6 w-6 text-primary" aria-hidden />
                Downloads de Gravações
              </h1>
              <p className="text-sm text-muted-foreground">
                Escolha o intervalo e as câmeras. O backend consulta o NVR via HTTP-CGI e salva os
                trechos no armazenamento privado.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" asChild size="sm">
                <Link to="/playback">
                  <PlayCircle className="mr-2 h-4 w-4" />
                  Playback ao vivo
                </Link>
              </Button>
              <Button variant="outline" asChild size="sm">
                <Link to="/playback/downloads/history">
                  <HistoryIcon className="mr-2 h-4 w-4" />
                  Histórico
                </Link>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void loadJobs()}
                disabled={refreshing}
              >
                <RefreshCw className={cn('mr-2 h-4 w-4', refreshing && 'animate-spin')} />
                Atualizar
              </Button>
            </div>
          </header>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Intervalo</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <DateTimeField
                label="Início"
                date={startDate}
                time={startTime}
                onDateChange={setStartDate}
                onTimeChange={setStartTime}
              />
              <DateTimeField
                label="Fim"
                date={endDate}
                time={endTime}
                onDateChange={setEndDate}
                onTimeChange={setEndTime}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Câmeras</CardTitle>
              <Badge variant="outline">{selectedCameraIds.size} selecionada(s)</Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              {camerasLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-6 w-1/3" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : nvrCameras.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhuma câmera vinculada a um NVR foi encontrada. Cadastre ou associe câmeras a um
                  NVR para habilitar downloads pelo HTTP-CGI.
                </p>
              ) : (
                Object.entries(camerasByNvr).map(([nvrId, cams]) => {
                  const nvr = nvrs.find((n) => n.id === nvrId);
                  const allSelected = cams.every((c) => selectedCameraIds.has(c.id));
                  return (
                    <div key={nvrId} className="rounded-md border border-border/60 p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2 text-sm font-medium">
                            <Layers className="h-4 w-4 text-primary" aria-hidden />
                            {nvr?.name ?? 'NVR desconhecido'}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {nvr?.host ?? ''} · {cams.length} câmera(s)
                            {nvrCreds[nvrId] && (
                              <span className="ml-2 text-emerald-600 dark:text-emerald-400">
                                • credenciais prontas
                              </span>
                            )}
                          </div>
                        </div>
                        <Button size="sm" variant="ghost" onClick={() => toggleNvr(nvrId)}>
                          {allSelected ? 'Desmarcar' : 'Marcar todas'}
                        </Button>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {cams.map((cam) => (
                          <label
                            key={cam.id}
                            className="flex items-center gap-2 rounded-md border border-border/50 p-2 text-sm hover:bg-muted/40"
                          >
                            <Checkbox
                              checked={selectedCameraIds.has(cam.id)}
                              onCheckedChange={() => toggleCamera(cam.id)}
                            />
                            <span className="flex-1 truncate">{cam.name}</span>
                            <Badge variant="outline" className="text-[10px]">
                              CH {cam.channel_number}
                            </Badge>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
              <div className="flex items-center justify-end">
                <Button onClick={handleStart} disabled={starting || selectedCameraIds.size === 0}>
                  <Download className={cn('mr-2 h-4 w-4', starting && 'animate-bounce')} />
                  {starting ? 'Enviando…' : 'Iniciar downloads sincronizados'}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Jobs recentes</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="p-3 font-medium">Câmera</th>
                      <th className="p-3 font-medium">Intervalo</th>
                      <th className="p-3 font-medium">Status</th>
                      <th className="p-3 font-medium">Progresso</th>
                      <th className="p-3 font-medium">Criado</th>
                      <th className="p-3 font-medium text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobsWithCameraName.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-sm text-muted-foreground">
                          Nenhum download registrado ainda.
                        </td>
                      </tr>
                    ) : (
                      jobsWithCameraName.map((row) => (
                        <NvrDownloadJobRow
                          key={row.id}
                          row={row}
                          onRetry={handleRetry}
                          onCancel={handleCancel}
                          onConvert={handleConvert}
                        />
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </PageContent>

      <NvrCredentialsDialog
        open={pendingCredsNvr !== null}
        nvrName={pendingCredsNvr?.name ?? ''}
        nvrHost={pendingCredsNvr?.host ?? ''}
        onCancel={() => setPendingCredsNvr(null)}
        onConfirm={handleCredsConfirm}
      />
    </>
  );
}
