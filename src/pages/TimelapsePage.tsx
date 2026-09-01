import type * as React from 'react';
/**
 * Onda Shinobi 5 — Página de Timelapse.
 * Configura captura periódica de snapshots por câmera e lista vídeos diários montados.
 */
import { useMemo, useState } from 'react';
import { Plus, Trash2, Film, CheckCircle2, XCircle, Loader2, Clock, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PageMeta } from '@/components/PageMeta';
import { useTimelapse, type TimelapseConfigInput, type TimelapseVideo } from '@/hooks/useTimelapse';
import { useCameras } from '@/hooks/useCameras';
import { PageContent } from '@/components/layout/MainLayout';

const DEFAULT_INPUT: TimelapseConfigInput = {
  camera_id: '',
  enabled: true,
  capture_interval_minutes: 5,
  start_hour: 6,
  end_hour: 20,
  fps: 30,
  retention_days: 7,
};

function videoBadge(s: TimelapseVideo['status']) {
  const map: Record<
    TimelapseVideo['status'],
    {
      label: string;
      variant: 'default' | 'secondary' | 'destructive' | 'outline';
      icon: React.JSX.Element;
    }
  > = {
    ready: { label: 'Pronto', variant: 'default', icon: <CheckCircle2 className="w-3 h-3" /> },
    rendering: {
      label: 'Renderizando',
      variant: 'secondary',
      icon: <Loader2 className="w-3 h-3 animate-spin" />,
    },
    pending: { label: 'Pendente', variant: 'outline', icon: <Clock className="w-3 h-3" /> },
    failed: { label: 'Falhou', variant: 'destructive', icon: <XCircle className="w-3 h-3" /> },
    skipped: { label: 'Pulado', variant: 'outline', icon: <XCircle className="w-3 h-3" /> },
  };
  const m = map[s];
  return (
    <Badge variant={m.variant} className="gap-1">
      {m.icon}
      {m.label}
    </Badge>
  );
}

export default function TimelapsePage() {
  const { configs, videos, loading, upsert, toggle, remove } = useTimelapse();
  const { cameras } = useCameras();

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<TimelapseConfigInput>(DEFAULT_INPUT);

  const cameraName = useMemo(() => {
    const map = new Map<string, string>();
    cameras.forEach((c) => map.set(c.id, c.name));
    return (id: string) => map.get(id) ?? '(câmera removida)';
  }, [cameras]);

  const availableCameras = useMemo(() => {
    const configured = new Set(configs.map((c) => c.camera_id));
    return cameras.filter((c) => !configured.has(c.id));
  }, [cameras, configs]);

  const openNew = () => {
    setDraft({ ...DEFAULT_INPUT, camera_id: availableCameras[0]?.id ?? '' });
    setOpen(true);
  };

  return (
    <PageContent className="p-4 sm:p-6">
      <PageMeta
        title="Timelapse · VISÃO"
        description="Configure a captura automática de snapshots e monte vídeos timelapse diários por câmera."
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
            <Film className="w-6 h-6" /> Timelapse
          </h1>
          <p className="text-sm text-muted-foreground">
            Capture snapshots automáticos dentro de uma janela horária e obtenha um vídeo diário por
            câmera.
          </p>
        </div>
        <Button onClick={openNew} disabled={availableCameras.length === 0}>
          <Plus className="w-4 h-4 mr-1" /> Nova configuração
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Configurações ({configs.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : configs.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Nenhuma configuração ainda. Escolha uma câmera para começar.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground text-left">
                  <tr>
                    <th className="py-2 pr-2">Câmera</th>
                    <th className="py-2 pr-2">Janela</th>
                    <th className="py-2 pr-2">Intervalo</th>
                    <th className="py-2 pr-2">FPS</th>
                    <th className="py-2 pr-2">Retenção</th>
                    <th className="py-2 pr-2">Última captura</th>
                    <th className="py-2 pr-2">Ativo</th>
                    <th className="py-2 pr-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {configs.map((c) => (
                    <tr key={c.id} className="border-t border-border">
                      <td className="py-2 pr-2 font-medium">{cameraName(c.camera_id)}</td>
                      <td className="py-2 pr-2 font-mono text-xs">
                        {String(c.start_hour).padStart(2, '0')}:00 →{' '}
                        {String(c.end_hour).padStart(2, '0')}:00
                      </td>
                      <td className="py-2 pr-2">{c.capture_interval_minutes} min</td>
                      <td className="py-2 pr-2">{c.fps}</td>
                      <td className="py-2 pr-2">{c.retention_days}d</td>
                      <td className="py-2 pr-2 text-xs text-muted-foreground">
                        {c.last_capture_at
                          ? new Date(c.last_capture_at).toLocaleString('pt-BR')
                          : '—'}
                      </td>
                      <td className="py-2 pr-2">
                        <Switch
                          checked={c.enabled}
                          onCheckedChange={(v) => toggle(c.id, v)}
                          aria-label={`${c.enabled ? 'Desativar' : 'Ativar'} timelapse ${cameraName(c.camera_id)}`}
                        />
                      </td>
                      <td className="py-2 pr-2 text-right">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => remove(c.id)}
                          aria-label={`Remover ${cameraName(c.camera_id)}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Vídeos recentes ({videos.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {videos.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Ainda não há vídeos renderizados. Eles aparecem após o fim da janela diária.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground text-left">
                  <tr>
                    <th className="py-2 pr-2">Data</th>
                    <th className="py-2 pr-2">Câmera</th>
                    <th className="py-2 pr-2">Quadros</th>
                    <th className="py-2 pr-2">Duração</th>
                    <th className="py-2 pr-2">Status</th>
                    <th className="py-2 pr-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {videos.map((v) => (
                    <tr key={v.id} className="border-t border-border">
                      <td className="py-2 pr-2 font-mono text-xs">{v.video_date}</td>
                      <td className="py-2 pr-2">{cameraName(v.camera_id)}</td>
                      <td className="py-2 pr-2">{v.frame_count}</td>
                      <td className="py-2 pr-2">{Number(v.duration_seconds).toFixed(1)}s</td>
                      <td className="py-2 pr-2">{videoBadge(v.status)}</td>
                      <td className="py-2 pr-2 text-right">
                        {v.storage_path && v.status === 'ready' ? (
                          <Button size="sm" variant="outline" asChild>
                            <a
                              href={v.storage_path}
                              target="_blank"
                              rel="noreferrer"
                              aria-label="Baixar vídeo"
                            >
                              <Download className="w-3.5 h-3.5 mr-1" /> Baixar
                            </a>
                          </Button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nova configuração de timelapse</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="tl-camera">Câmera</Label>
              <Select
                value={draft.camera_id}
                onValueChange={(v) => setDraft({ ...draft, camera_id: v })}
              >
                <SelectTrigger id="tl-camera">
                  <SelectValue placeholder="Selecione…" />
                </SelectTrigger>
                <SelectContent>
                  {availableCameras.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="tl-start">Hora início</Label>
                <Input
                  id="tl-start"
                  type="number"
                  min={0}
                  max={23}
                  value={draft.start_hour}
                  onChange={(e) => setDraft({ ...draft, start_hour: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tl-end">Hora fim</Label>
                <Input
                  id="tl-end"
                  type="number"
                  min={1}
                  max={24}
                  value={draft.end_hour}
                  onChange={(e) => setDraft({ ...draft, end_hour: Number(e.target.value) })}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="tl-int">Intervalo (min)</Label>
                <Input
                  id="tl-int"
                  type="number"
                  min={1}
                  max={120}
                  value={draft.capture_interval_minutes}
                  onChange={(e) =>
                    setDraft({ ...draft, capture_interval_minutes: Number(e.target.value) })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tl-fps">FPS</Label>
                <Input
                  id="tl-fps"
                  type="number"
                  min={5}
                  max={60}
                  value={draft.fps}
                  onChange={(e) => setDraft({ ...draft, fps: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tl-ret">Retenção (dias)</Label>
                <Input
                  id="tl-ret"
                  type="number"
                  min={1}
                  max={365}
                  value={draft.retention_days}
                  onChange={(e) => setDraft({ ...draft, retention_days: Number(e.target.value) })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={async () => {
                const saved = await upsert(draft);
                if (saved) setOpen(false);
              }}
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContent>
  );
}
