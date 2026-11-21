/**
 * VISÃO — Playback multi-câmera sincronizado
 *
 * Permite selecionar até 4 câmeras e reproduzir os clips mais recentes
 * de cada uma em paralelo, com controle unificado de play/pause/seek
 * e velocidade. Base para o "wall of playback" estilo mesa CFTV.
 *
 * Fonte de dados atual: tabela `video_clips` (clips MP4 já gravados
 * no storage). Próxima onda: streaming direto de gravações no NVR via
 * Edge Function DVR-IP/CGI.
 */
import { useEffect, useMemo, useState } from 'react';
import { Layers, Camera, RefreshCw, Download } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useCameras } from '@/hooks/useCameras';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { PageMeta } from '@/components/PageMeta';
import { PageContent } from '@/components/layout/MainLayout';
import { SyncPlaybackGrid, type SyncPlaybackSource } from '@/components/playback/SyncPlaybackGrid';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';
import { refreshClipUrls } from '@/lib/clipStorageUrls';

const MAX_CAMERAS = 4;

interface ClipRow {
  id: string;
  camera_id: string | null;
  file_url: string | null;
  start_time: string;
  duration: number | null;
}

export default function SyncPlaybackPage() {
  const { cameras } = useCameras();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [clipsByCamera, setClipsByCamera] = useState<Record<string, ClipRow | undefined>>({});
  const [columns, setColumns] = useState<1 | 2 | 3 | 4>(2);
  const [loading, setLoading] = useState(false);

  const loadLatestClips = useMemo(
    () => async (ids: string[]) => {
      if (ids.length === 0) {
        setClipsByCamera({});
        return;
      }
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('video_clips')
          .select('id, camera_id, file_url, start_time, duration')
          .in('camera_id', ids)
          .not('file_url', 'is', null)
          .order('start_time', { ascending: false });
        if (error) throw error;
        const map: Record<string, ClipRow | undefined> = {};
        for (const row of (data ?? []) as ClipRow[]) {
          if (row.camera_id && !map[row.camera_id]) {
            const { file_url } = await refreshClipUrls(row.file_url, null);
            map[row.camera_id] = { ...row, file_url };
          }
        }
        setClipsByCamera(map);
        const missing = ids.filter((id) => !map[id]);
        if (missing.length > 0) {
          toast.warning(`${missing.length} câmera(s) sem gravação recente disponível.`);
        }
      } catch (e) {
        toast.error('Não foi possível carregar as gravações.');
        if (import.meta.env.DEV) logger.error('[sync-playback] falha', e);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    void loadLatestClips(selectedIds);
  }, [selectedIds, loadLatestClips]);

  const sources: SyncPlaybackSource[] = useMemo(() => {
    const out: SyncPlaybackSource[] = [];
    for (const id of selectedIds) {
      const clip = clipsByCamera[id];
      const cam = cameras.find((c) => c.id === id);
      if (!clip || !clip.file_url || !cam) continue;
      out.push({
        cameraId: id,
        cameraName: cam.name,
        sourceUrl: clip.file_url,
        startsAt: clip.start_time,
        durationSec: clip.duration ?? undefined,
      });
    }
    return out;
  }, [selectedIds, clipsByCamera, cameras]);

  const availableCameras = cameras.filter((c) => !selectedIds.includes(c.id));

  const handleAdd = (cameraId: string) => {
    if (selectedIds.length >= MAX_CAMERAS) {
      toast.warning(`Máximo de ${MAX_CAMERAS} câmeras simultâneas.`);
      return;
    }
    setSelectedIds((prev) => (prev.includes(cameraId) ? prev : [...prev, cameraId]));
  };

  const handleRemove = (cameraId: string) => {
    setSelectedIds((prev) => prev.filter((id) => id !== cameraId));
  };

  return (
    <>
      <PageMeta
        title="Playback Sincronizado | VISÃO"
        description="Reproduza gravações de várias câmeras em paralelo com controle unificado."
      />
      <PageContent>
        <div className="space-y-6">
          <header className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1">
              <h1 className="flex items-center gap-2 text-2xl font-semibold text-foreground">
                <Layers className="h-6 w-6 text-primary" aria-hidden />
                Playback Sincronizado
              </h1>
              <p className="text-sm text-muted-foreground">
                Selecione até {MAX_CAMERAS} câmeras e reveja as gravações mais recentes lado a lado.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {selectedIds.length}/{MAX_CAMERAS} câmeras
              </Badge>
              <Button size="sm" variant="outline" asChild>
                <Link to="/playback/downloads">
                  <Download className="mr-2 h-4 w-4" />
                  Baixar do NVR
                </Link>
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => void loadLatestClips(selectedIds)}
                disabled={loading || selectedIds.length === 0}
              >
                <RefreshCw className={loading ? 'mr-2 h-4 w-4 animate-spin' : 'mr-2 h-4 w-4'} />
                Recarregar
              </Button>
            </div>
          </header>

          <Card>
            <CardContent className="flex flex-wrap items-end gap-3 p-4">
              <div className="min-w-[220px] flex-1 space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Adicionar câmera
                </label>
                <Select
                  value=""
                  onValueChange={(v) => v && handleAdd(v)}
                  disabled={availableCameras.length === 0 || selectedIds.length >= MAX_CAMERAS}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma câmera…" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCameras.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        <Camera className="mr-2 inline h-3.5 w-3.5" />
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="w-32 space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Layout</label>
                <Select
                  value={String(columns)}
                  onValueChange={(v) => setColumns(Number(v) as 1 | 2 | 3 | 4)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 coluna</SelectItem>
                    <SelectItem value="2">2 colunas</SelectItem>
                    <SelectItem value="3">3 colunas</SelectItem>
                    <SelectItem value="4">4 colunas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {loading && sources.length === 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {Array.from({ length: Math.max(selectedIds.length, 2) }).map((_, i) => (
                <Skeleton key={i} className="aspect-video w-full rounded-lg" />
              ))}
            </div>
          ) : (
            <SyncPlaybackGrid sources={sources} columns={columns} onRemove={handleRemove} />
          )}
        </div>
      </PageContent>
    </>
  );
}
