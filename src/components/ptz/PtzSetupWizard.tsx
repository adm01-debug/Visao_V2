import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ChevronDown, ChevronUp, CheckCircle2, Home,
  Loader2, Radar, Save, Sparkles, Star, Wand2, XCircle, Zap, ZoomIn, ZoomOut,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { usePtzControl } from '@/hooks/usePtzControl';
import { getProfileById } from '@/lib/onvifProfiles';

interface PtzSetupWizardProps {
  cameraId: string;
  cameraName?: string;
  /**
   * Perfil OEM detectado (ex.: `xiongmai-nbd80x`). Quando informado, o wizard
   * pré-aplica os `ptzBackends` do perfil em modo `auto-multi` — dispensando
   * a pergunta sobre marca do dome, já que a XiongMai encapsula domes de
   * múltiplos fabricantes (PELCO-D, DaHua-SD, Hikvision, etc.) e o firmware
   * negocia o protocolo internamente.
   */
  profileId?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}


type PtzLimits = {
  pan: { min: number; max: number };
  tilt: { min: number; max: number };
  zoom: { min: number; max: number };
};

const DEFAULT_LIMITS: PtzLimits = {
  pan: { min: -1, max: 1 },
  tilt: { min: -1, max: 1 },
  zoom: { min: 0, max: 1 },
};

const STEPS = [
  { id: 'detect', label: 'Detectar' },
  { id: 'presets', label: 'Presets' },
  { id: 'limits', label: 'Limites' },
  { id: 'review', label: 'Revisão' },
] as const;

type StepId = typeof STEPS[number]['id'];

export function PtzSetupWizard({ cameraId, cameraName, profileId, open, onOpenChange }: PtzSetupWizardProps) {
  const qc = useQueryClient();
  const ptz = usePtzControl({ cameraId, enabled: open });
  const [step, setStep] = useState<StepId>('detect');
  const [limits, setLimits] = useState<PtzLimits>(DEFAULT_LIMITS);
  const [presetDraft, setPresetDraft] = useState<{ number: number; name: string }>({
    number: 1, name: 'Home',
  });

  // Perfil OEM: XiongMai (NBD80X/HZXM/Usecam OEM) e similares expõem múltiplos
  // protocolos PTZ nativos no mesmo firmware; o wizard aplica todos em modo
  // auto-multi e evita perguntar a marca do dome ao usuário.
  const profile = useMemo(() => (profileId ? getProfileById(profileId) : null), [profileId]);
  const autoMultiBackends = useMemo(() => profile?.ptzBackends ?? [], [profile]);
  const isAutoMulti = autoMultiBackends.length > 0;

  // Ordem de prioridade dos backends nativos (modo auto-multi). O firmware
  // tentará na sequência definida — priorizar os com maior chance encurta o
  // tempo até primeira resposta útil.
  const [orderedBackends, setOrderedBackends] = useState<string[]>([]);


  // Config atual
  const config = useQuery({
    queryKey: ['ptz-config', cameraId],
    enabled: open && !!cameraId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('camera_ptz_config')
        .select('*')
        .eq('camera_id', cameraId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (config.data?.limits) {
      const l = config.data.limits as Partial<PtzLimits>;
      setLimits({
        pan: l.pan ?? DEFAULT_LIMITS.pan,
        tilt: l.tilt ?? DEFAULT_LIMITS.tilt,
        zoom: l.zoom ?? DEFAULT_LIMITS.zoom,
      });
    }
  }, [config.data]);

  // Hidrata ordem dos backends: usa a ordem persistida (se existir e for
  // consistente com o perfil OEM), senão cai na ordem canônica do perfil.
  useEffect(() => {
    if (!isAutoMulti) return;
    const persisted = (config.data as { ptz_backends?: string[] } | null)?.ptz_backends ?? [];
    const known = new Set(autoMultiBackends);
    const filtered = persisted.filter((b) => known.has(b));
    const missing = autoMultiBackends.filter((b) => !filtered.includes(b));
    setOrderedBackends([...filtered, ...missing]);
  }, [config.data, autoMultiBackends, isAutoMulti]);

  const moveBackend = (index: number, delta: -1 | 1) => {
    setOrderedBackends((prev) => {
      const next = [...prev];
      const target = index + delta;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target]!, next[index]!];
      return next;
    });
  };

  const sortByBenchmark = () => {
    if (!backendResults || backendResults.length === 0) return;
    const rank = new Map<string, { ok: boolean; reachable: boolean; latency: number }>();
    for (const r of backendResults) {
      rank.set(r.backend, { ok: r.ok, reachable: r.reachable, latency: r.latency_ms });
    }
    setOrderedBackends((prev) => [...prev].sort((a, b) => {
      const ra = rank.get(a); const rb = rank.get(b);
      // Não testados vão para o fim
      if (!ra && !rb) return 0;
      if (!ra) return 1;
      if (!rb) return -1;
      // OK antes de não-OK
      if (ra.ok !== rb.ok) return ra.ok ? -1 : 1;
      // Alcançáveis antes de inalcançáveis (para não-OK)
      if (ra.reachable !== rb.reachable) return ra.reachable ? -1 : 1;
      // Menor latência primeiro
      return ra.latency - rb.latency;
    }));
    toast.success('Ordem reorganizada pelo benchmark');
  };


  // Descoberta ONVIF (também valida credenciais)
  const discover = useMutation({
    mutationFn: async () => {
      const cfg = config.data;
      if (!cfg) throw new Error('Configuração PTZ não encontrada — cadastre a câmera antes.');
      const { data, error } = await supabase.functions.invoke('ptz-onvif-discover', {
        body: {
          camera_id: cameraId,
          protocol: cfg.protocol,
          endpoint: cfg.endpoint,
          port: cfg.port,
          channel: cfg.channel,
          username: cfg.username ?? '',
          password: cfg.password_encrypted ?? '',
          import_presets: true,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as { ok: boolean; capabilities: Record<string, unknown>; presets: unknown[]; imported: number };
    },
    onSuccess: (data) => {
      toast.success(`Detecção concluída · ${data.imported ?? 0} preset(s) importado(s)`);
      qc.invalidateQueries({ queryKey: ['ptz-config', cameraId] });
      qc.invalidateQueries({ queryKey: ['ptz-presets', cameraId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Teste dos backends PTZ nativos (não-destrutivo: envia `stop`).
  // Retorna sucesso/erro + latência por protocolo antes do usuário salvar.
  type BackendResult = {
    backend: string;
    ok: boolean;
    reachable: boolean;
    status: number;
    latency_ms: number;
    detail: string;
  };
  const [backendResults, setBackendResults] = useState<BackendResult[] | null>(null);

  const testBackends = useMutation({
    mutationFn: async () => {
      const backends = isAutoMulti
        ? (orderedBackends.length ? orderedBackends : autoMultiBackends)
        : (protocol ? [protocol] : []);
      const { data, error } = await supabase.functions.invoke('ptz-backends-test', {
        body: { camera_id: cameraId, backends },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.hint ?? data.error);
      return data as { ok: boolean; results: BackendResult[] };
    },
    onSuccess: (data) => {
      setBackendResults(data.results);
      const okCount = data.results.filter((r) => r.ok).length;
      if (okCount > 0) toast.success(`${okCount}/${data.results.length} backend(s) responderam`);
      else toast.error('Nenhum backend PTZ respondeu');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Salvar configuração final — inclui backends nativos quando o perfil OEM
  // (ex.: XiongMai) fornece uma lista pré-validada.
  const saveConfig = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {
        limits,
        setup_completed_at: new Date().toISOString(),
      };
      if (isAutoMulti) {
        payload.ptz_backends = orderedBackends.length ? orderedBackends : autoMultiBackends;
        payload.ptz_backends_mode = 'auto-multi';
      }
      const { error } = await supabase
        .from('camera_ptz_config')
        .update(payload as never)
        .eq('camera_id', cameraId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Configuração PTZ concluída');
      qc.invalidateQueries({ queryKey: ['ptz-config', cameraId] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });


  const cfg = config.data;
  const protocol = cfg?.protocol as string | undefined;

  const nudge = async (pan: number, tilt: number) => {
    await ptz.startMove({ pan, tilt, speed: 4 });
    setTimeout(() => void ptz.stopMove(), 350);
  };

  const testLimit = async (axis: keyof PtzLimits, edge: 'min' | 'max') => {
    const value = limits[axis][edge];
    if (axis === 'zoom') {
      await ptz.zoom(value, 4);
      setTimeout(() => void ptz.send('stop'), 400);
      return;
    }
    const params = axis === 'pan' ? { pan: value, tilt: 0 } : { pan: 0, tilt: value };
    await ptz.startMove({ ...params, speed: 4 });
    setTimeout(() => void ptz.stopMove(), 500);
  };

  const stepIndex = STEPS.findIndex((s) => s.id === step);

  const nextPresetNumber = useMemo(() => {
    const taken = new Set(ptz.presets.map((p) => p.preset_number));
    for (let i = 1; i <= 32; i++) if (!taken.has(i)) return i;
    return 1;
  }, [ptz.presets]);

  useEffect(() => {
    setPresetDraft((d) => ({ ...d, number: nextPresetNumber }));
  }, [nextPresetNumber]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-primary" />
            Configuração assistida de PTZ
          </DialogTitle>
          <DialogDescription>
            {cameraName ? `Câmera: ${cameraName}` : 'Guia rápido em 4 etapas'} · Protocolo: {protocol ?? '—'}
          </DialogDescription>
        </DialogHeader>

        {/* Stepper */}
        <ol className="flex items-center gap-2 text-sm">
          {STEPS.map((s, i) => {
            const active = s.id === step;
            const done = i < stepIndex;
            return (
              <li key={s.id} className="flex items-center gap-2 flex-1">
                <div
                  className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs font-medium ${
                    active
                      ? 'bg-primary text-primary-foreground border-primary'
                      : done
                      ? 'bg-success text-success-foreground border-success'
                      : 'bg-muted text-muted-foreground border-border'
                  }`}
                >
                  {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : i + 1}
                </div>
                <span className={active ? 'font-medium' : 'text-muted-foreground'}>{s.label}</span>
                {i < STEPS.length - 1 && <Separator className="flex-1" />}
              </li>
            );
          })}
        </ol>

        <div className="min-h-[280px] pt-2">
          {config.isLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> Carregando configuração PTZ…
            </div>
          )}

          {!config.isLoading && !cfg && (
            <Alert variant="destructive">
              <AlertTitle>Câmera sem PTZ habilitado</AlertTitle>
              <AlertDescription>
                Edite o cadastro da câmera e ative o PTZ (ONVIF ou Hikvision ISAPI) antes de usar o assistente.
              </AlertDescription>
            </Alert>
          )}

          {cfg && step === 'detect' && (
            <div className="space-y-4">
              <Alert>
                <Radar className="w-4 h-4" />
                <AlertTitle>Detecção automática</AlertTitle>
                <AlertDescription>
                  {protocol === 'onvif'
                    ? 'Vamos consultar a câmera via ONVIF (GetCapabilities, GetProfiles, GetPresets) para validar credenciais e importar presets existentes.'
                    : 'Vamos validar a comunicação com o endpoint ISAPI/CGI. Presets existentes podem ser importados manualmente na etapa seguinte.'}
                </AlertDescription>
              </Alert>

              {isAutoMulti && profile && (
                <Alert className="border-primary/40">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <AlertTitle className="flex items-center gap-2">
                    Perfil {profile.displayName} detectado
                    <Badge variant="secondary" className="font-mono text-[10px]">auto-multi</Badge>
                  </AlertTitle>
                  <AlertDescription className="space-y-2">
                    <p>
                      Este OEM encapsula domes de múltiplos fabricantes no mesmo firmware.
                      Vamos tentar automaticamente os {autoMultiBackends.length} protocolos
                      nativos suportados sem perguntar a marca do dome — o próprio DVR/NVR
                      negocia qual responde.
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {autoMultiBackends.slice(0, 10).map((b) => (
                        <Badge key={b} variant="outline" className="font-mono text-[10px]">{b}</Badge>
                      ))}
                      {autoMultiBackends.length > 10 && (
                        <Badge variant="outline" className="font-mono text-[10px]">
                          +{autoMultiBackends.length - 10}
                        </Badge>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}


              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Endpoint:</span> <span className="font-mono">{cfg.endpoint}:{cfg.port}</span></div>
                <div><span className="text-muted-foreground">Canal:</span> {cfg.channel}</div>
                <div><span className="text-muted-foreground">Usuário:</span> {cfg.username ?? '—'}</div>
                <div><span className="text-muted-foreground">Velocidade padrão:</span> {cfg.default_speed}</div>
              </div>

              {protocol === 'onvif' && (
                <Button onClick={() => discover.mutate()} disabled={discover.isPending} className="w-full">
                  {discover.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Radar className="w-4 h-4 mr-2" />}
                  Detectar capabilities & importar presets
                </Button>
              )}

              {discover.data && (
                <div className="rounded-md border p-3 text-sm space-y-1">
                  <div className="flex items-center gap-2 text-success">
                    <CheckCircle2 className="w-4 h-4" /> Conexão validada
                  </div>
                  <div>Modelo: <span className="font-mono">{String((discover.data.capabilities as Record<string, unknown>).model ?? '—')}</span></div>
                  <div>Presets encontrados: {discover.data.presets?.length ?? 0} · Importados: {discover.data.imported}</div>
                </div>
              )}

              {/* Teste automático dos backends PTZ nativos — não-destrutivo (stop). */}
              <div className="space-y-2">
                <Button
                  variant="outline"
                  onClick={() => testBackends.mutate()}
                  disabled={testBackends.isPending}
                  className="w-full"
                >
                  {testBackends.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Zap className="w-4 h-4 mr-2" />}
                  {isAutoMulti
                    ? `Testar ${autoMultiBackends.length} backend(s) nativo(s)`
                    : 'Testar backend PTZ'}
                </Button>

                {backendResults && backendResults.length > 0 && (
                  <div className="rounded-md border divide-y">
                    {backendResults.map((r) => (
                      <div key={r.backend} className="flex items-center justify-between gap-3 p-2 text-sm">
                        <div className="flex items-center gap-2 min-w-0">
                          {r.ok ? (
                            <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                          ) : (
                            <XCircle className="w-4 h-4 text-destructive shrink-0" />
                          )}
                          <span className="font-mono uppercase text-xs">{r.backend}</span>
                          {!r.ok && r.reachable && (
                            <Badge variant="outline" className="text-[10px]">alcançável</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
                          <span className="font-mono">HTTP {r.status || '—'}</span>
                          <span className="font-mono">{r.latency_ms}ms</span>
                        </div>
                      </div>
                    ))}
                    {backendResults.every((r) => !r.ok) && (
                      <div className="p-2 text-xs text-destructive">
                        Nenhum backend respondeu com sucesso. Verifique credenciais, porta e conectividade LAN antes de salvar.
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Prioridade dos backends nativos (auto-multi). O firmware tentará
                  na ordem definida — mova os com maior chance para o topo. */}
              {isAutoMulti && orderedBackends.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Prioridade dos backends</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={sortByBenchmark}
                      disabled={!backendResults || backendResults.length === 0}
                      title={!backendResults ? 'Rode o teste antes' : 'Ordenar pelos resultados do teste'}
                    >
                      <Sparkles className="w-3.5 h-3.5 mr-1" />
                      Auto-ordenar por benchmark
                    </Button>
                  </div>
                  <div className="rounded-md border divide-y">
                    {orderedBackends.map((backend, index) => {
                      const r = backendResults?.find((x) => x.backend === backend);
                      return (
                        <div key={backend} className="flex items-center justify-between gap-2 p-2 text-sm">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-5 text-xs font-mono text-muted-foreground text-right">
                              {index + 1}.
                            </span>
                            <span className="font-mono uppercase text-xs">{backend}</span>
                            {r?.ok && <Badge variant="outline" className="text-[10px] border-success/40 text-success">ok</Badge>}
                            {r && !r.ok && r.reachable && (
                              <Badge variant="outline" className="text-[10px]">alcançável</Badge>
                            )}
                            {r && !r.reachable && (
                              <Badge variant="outline" className="text-[10px] border-destructive/40 text-destructive">falhou</Badge>
                            )}
                            {r && (
                              <span className="text-[10px] text-muted-foreground font-mono">
                                {r.latency_ms}ms
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              variant="ghost" size="icon" className="h-7 w-7"
                              onClick={() => moveBackend(index, -1)}
                              disabled={index === 0}
                              aria-label={`Subir ${backend}`}
                            >
                              <ChevronUp className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost" size="icon" className="h-7 w-7"
                              onClick={() => moveBackend(index, 1)}
                              disabled={index === orderedBackends.length - 1}
                              aria-label={`Descer ${backend}`}
                            >
                              <ChevronDown className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    A ordem é salva junto com a configuração e usada como sequência de tentativa em modo auto-multi.
                  </p>
                </div>
              )}
            </div>
          )}

          {cfg && step === 'presets' && (
            <div className="space-y-4">
              <Alert>
                <Star className="w-4 h-4" />
                <AlertTitle>Posicionar & salvar presets</AlertTitle>
                <AlertDescription>
                  Use os controles abaixo para posicionar a câmera. Quando estiver no local desejado, dê um nome e salve como preset.
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-[auto_1fr] gap-6 items-start">
                <div className="grid grid-cols-3 gap-1">
                  <div />
                  <Button variant="outline" size="icon" onClick={() => void nudge(0, 1)}><ArrowUp className="w-4 h-4" /></Button>
                  <div />
                  <Button variant="outline" size="icon" onClick={() => void nudge(-1, 0)}><ArrowLeft className="w-4 h-4" /></Button>
                  <Button variant="outline" size="icon" onClick={() => void ptz.home()}><Home className="w-4 h-4" /></Button>
                  <Button variant="outline" size="icon" onClick={() => void nudge(1, 0)}><ArrowRight className="w-4 h-4" /></Button>
                  <Button variant="outline" size="icon" onClick={() => void ptz.zoom(-0.5, 4)}><ZoomOut className="w-4 h-4" /></Button>
                  <Button variant="outline" size="icon" onClick={() => void nudge(0, -1)}><ArrowDown className="w-4 h-4" /></Button>
                  <Button variant="outline" size="icon" onClick={() => void ptz.zoom(0.5, 4)}><ZoomIn className="w-4 h-4" /></Button>
                </div>

                <div className="space-y-3">
                  <div className="grid grid-cols-[80px_1fr] gap-2 items-center">
                    <Label htmlFor="preset-number">Número</Label>
                    <Input
                      id="preset-number"
                      type="number"
                      min={1} max={32}
                      value={presetDraft.number}
                      onChange={(e) => setPresetDraft((d) => ({ ...d, number: Number(e.target.value) }))}
                    />
                    <Label htmlFor="preset-name">Nome</Label>
                    <Input
                      id="preset-name"
                      value={presetDraft.name}
                      maxLength={60}
                      onChange={(e) => setPresetDraft((d) => ({ ...d, name: e.target.value }))}
                      placeholder="Ex: Portão, Estacionamento"
                    />
                  </div>
                  <Button
                    className="w-full"
                    onClick={async () => {
                      await ptz.savePreset(presetDraft.number, presetDraft.name.trim() || `Preset ${presetDraft.number}`);
                      toast.success(`Preset ${presetDraft.number} salvo`);
                    }}
                  >
                    <Save className="w-4 h-4 mr-2" /> Salvar posição atual como preset
                  </Button>

                  <div className="text-xs text-muted-foreground">
                    {ptz.presets.length} preset(s) cadastrado(s)
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {ptz.presets.slice(0, 12).map((p) => (
                      <Badge key={p.preset_number} variant="secondary" className="cursor-pointer" onClick={() => void ptz.gotoPreset(p.preset_number)}>
                        {p.preset_number}. {p.name ?? 'preset'}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {cfg && step === 'limits' && (
            <div className="space-y-5">
              <Alert>
                <AlertTitle>Limites operacionais</AlertTitle>
                <AlertDescription>
                  Restringe a amplitude máxima de pan/tilt/zoom para impedir que a câmera aponte para áreas privadas ou saia do enquadramento útil. Valores em -1 a 1 (proporção do curso total).
                </AlertDescription>
              </Alert>

              {(['pan', 'tilt', 'zoom'] as const).map((axis) => {
                const bounds = axis === 'zoom' ? [0, 1] : [-1, 1];
                const l = limits[axis];
                return (
                  <div key={axis} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <Label className="capitalize">{axis === 'pan' ? 'Horizontal (pan)' : axis === 'tilt' ? 'Vertical (tilt)' : 'Zoom'}</Label>
                      <span className="font-mono text-xs text-muted-foreground">
                        {l.min.toFixed(2)} → {l.max.toFixed(2)}
                      </span>
                    </div>
                    <Slider
                      value={[l.min, l.max]}
                      min={bounds[0]} max={bounds[1]} step={0.05}
                      onValueChange={([min, max]) =>
                        setLimits((prev) => ({ ...prev, [axis]: { min: min ?? bounds[0], max: max ?? bounds[1] } }))
                      }
                    />
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => void testLimit(axis, 'min')}>
                        Testar mínimo
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => void testLimit(axis, 'max')}>
                        Testar máximo
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {cfg && step === 'review' && (
            <div className="space-y-3 text-sm">
              <Alert>
                <CheckCircle2 className="w-4 h-4" />
                <AlertTitle>Revisão final</AlertTitle>
                <AlertDescription>Confirme os dados abaixo para concluir a configuração assistida.</AlertDescription>
              </Alert>
              <div className="rounded-md border p-3 space-y-1">
                <div><b>Protocolo:</b> {protocol}</div>
                <div><b>Endpoint:</b> {cfg.endpoint}:{cfg.port}</div>
                <div><b>Presets:</b> {ptz.presets.length}</div>
                {isAutoMulti && (
                  <div>
                    <b>Protocolos PTZ:</b>{' '}
                    <Badge variant="secondary" className="font-mono text-[10px] mr-1">auto-multi</Badge>
                    <span className="text-muted-foreground">
                      {autoMultiBackends.length} backends nativos ({profile?.displayName})
                    </span>
                  </div>
                )}

                <div><b>Limites:</b></div>
                <ul className="ml-4 list-disc text-muted-foreground">
                  <li>Pan: {limits.pan.min.toFixed(2)} → {limits.pan.max.toFixed(2)}</li>
                  <li>Tilt: {limits.tilt.min.toFixed(2)} → {limits.tilt.max.toFixed(2)}</li>
                  <li>Zoom: {limits.zoom.min.toFixed(2)} → {limits.zoom.max.toFixed(2)}</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="ghost"
            disabled={stepIndex === 0}
            onClick={() => setStep(STEPS[Math.max(0, stepIndex - 1)]!.id)}
          >
            Voltar
          </Button>
          {step !== 'review' ? (
            <Button
              onClick={() => setStep(STEPS[Math.min(STEPS.length - 1, stepIndex + 1)]!.id)}
              disabled={!cfg}
            >
              Continuar
            </Button>
          ) : (
            <Button onClick={() => saveConfig.mutate()} disabled={saveConfig.isPending}>
              {saveConfig.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
              Concluir configuração
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
