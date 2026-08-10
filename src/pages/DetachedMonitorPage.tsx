/**
 * Onda 189 — Janela destacada (segunda tela).
 *
 * Página standalone: sem sidebar, sem cabeçalho do console. Ela bate ponto no
 * `BroadcastChannel` para que o console saiba que continua viva e avisa ao
 * fechar. Se o console pedir o fechamento, ela obedece.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { MonitorX, VideoOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { StreamPlayer } from '@/components/StreamPlayer';
import { PageMeta } from '@/components/PageMeta';
import { Badge } from '@/components/ui/badge';
import {
  DETACHED_CHANNEL,
  HEARTBEAT_INTERVAL_MS,
  type DetachedMessage,
} from '@/lib/views/detachedMonitor';

interface DetachedCamera {
  id: string;
  name: string;
  location: string | null;
  status: string;
  stream_url: string | null;
  substream_url: string | null;
  substream_enabled: boolean | null;
}

export default function DetachedMonitorPage() {
  const { cameraId = '' } = useParams<{ cameraId: string }>();
  const [params] = useSearchParams();
  const windowName = params.get('w') ?? `visao-monitor-${cameraId}`;

  const [camera, setCamera] = useState<DetachedCamera | null>(null);
  const [loading, setLoading] = useState(true);
  const nameRef = useRef(windowName);
  nameRef.current = windowName;

  // Carrega a câmera pela RLS do próprio usuário — nada é passado pela URL.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data } = await supabase
        .from('cameras')
        .select('id, name, location, status, stream_url, substream_url, substream_enabled')
        .eq('id', cameraId)
        .maybeSingle();
      if (!cancelled) {
        setCamera((data as DetachedCamera | null) ?? null);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [cameraId]);

  // Batida de ponto + obediência ao pedido de fechamento do console.
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined' || !cameraId) return;
    const channel = new BroadcastChannel(DETACHED_CHANNEL);
    const beat = () =>
      channel.postMessage({
        type: 'heartbeat',
        cameraId,
        windowName: nameRef.current,
        at: Date.now(),
      } satisfies DetachedMessage);

    beat();
    const timer = window.setInterval(beat, HEARTBEAT_INTERVAL_MS);

    channel.onmessage = (event: MessageEvent<DetachedMessage>) => {
      if (event.data?.type === 'close-request' && event.data.cameraId === cameraId) {
        window.close();
      }
    };

    const announceClose = () => {
      channel.postMessage({
        type: 'closed',
        cameraId,
        windowName: nameRef.current,
      } satisfies DetachedMessage);
    };
    window.addEventListener('pagehide', announceClose);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener('pagehide', announceClose);
      announceClose();
      channel.onmessage = null;
      channel.close();
    };
  }, [cameraId]);

  const streamUrl = useMemo(() => {
    if (!camera) return null;
    return camera.substream_enabled && camera.substream_url
      ? camera.substream_url
      : camera.stream_url;
  }, [camera]);

  return (
    <div className="flex h-screen w-screen flex-col bg-background text-foreground">
      <PageMeta
        title={camera ? `${camera.name} | Monitor destacado` : 'Monitor destacado | VISÃO'}
        description="Janela destacada de uma câmera para uso em segundo monitor."
      />

      <header className="flex items-center justify-between gap-3 border-b px-4 py-2">
        <div className="min-w-0">
          <h1 className="truncate text-sm font-semibold">
            {loading ? 'Carregando…' : (camera?.name ?? 'Câmera indisponível')}
          </h1>
          {camera?.location && (
            <p className="truncate text-xs text-muted-foreground">{camera.location}</p>
          )}
        </div>
        {camera && (
          <Badge variant={camera.status === 'online' ? 'default' : 'secondary'}>
            {camera.status}
          </Badge>
        )}
      </header>

      <main className="flex flex-1 items-center justify-center overflow-hidden bg-muted/30 p-2">
        {loading ? (
          <p className="text-sm text-muted-foreground">Abrindo o vídeo…</p>
        ) : !camera ? (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <MonitorX className="h-8 w-8" aria-hidden="true" />
            <p className="text-sm">Câmera indisponível ou sem permissão de acesso.</p>
          </div>
        ) : streamUrl ? (
          <StreamPlayer streamUrl={streamUrl} className="h-full w-full" />
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <VideoOff className="h-8 w-8" aria-hidden="true" />
            <p className="text-sm">Esta câmera ainda não tem stream configurado.</p>
          </div>
        )}
      </main>
    </div>
  );
}
