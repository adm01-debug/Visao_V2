/**
 * VISÃO — Onda 124: aba "Enviar da câmera (RTMP)" do assistente.
 * Mostra URL de publicação, chave, saúde do recebimento e rotação/revogação.
 */

import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Copy, RefreshCw, ShieldOff, Radio, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { useCameraIngest } from '@/hooks/useCameraIngest';
import {
  buildPublishUrl,
  classifyIngestHealth,
  maskStreamKey,
  INGEST_HEALTH_LABEL,
  type IngestProtocol,
} from '@/lib/ingest/streamIngest';

interface CameraIngestPushCardProps {
  cameraId: string | null;
  /** Host público do servidor de mídia (ex.: `stream.exemplo.com`). */
  mediaHost?: string;
}

const HEALTH_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  healthy: 'default',
  silent: 'destructive',
  never_published: 'secondary',
  revoked: 'outline',
  not_push: 'outline',
};

export function CameraIngestPushCard({ cameraId, mediaHost }: CameraIngestPushCardProps) {
  const { endpoint, loading, error, enablePush, rotateKey, revoke } = useCameraIngest(cameraId);
  const [revealed, setRevealed] = useState(false);

  const envHost = import.meta.env.VITE_MEDIA_INGEST_HOST;
  const host = mediaHost ?? (typeof envHost === 'string' && envHost ? envHost : 'ingest.visao.local');

  const publish = useMemo(() => {
    if (!endpoint) return null;
    return buildPublishUrl(endpoint.protocol as IngestProtocol, host, endpoint.stream_key);
  }, [endpoint, host]);

  const verdict = useMemo(() => {
    if (!endpoint) return null;
    return classifyIngestHealth({
      protocol: endpoint.protocol as IngestProtocol,
      status: endpoint.status as 'pending' | 'publishing' | 'idle' | 'revoked',
      lastPublishAt: endpoint.last_publish_at,
      createdAt: endpoint.created_at,
      staleAfterSeconds: endpoint.stale_after_seconds,
    });
  }, [endpoint]);

  const copy = async (value: string, label: string) => {
    await navigator.clipboard.writeText(value);
    toast.success(`${label} copiado`);
  };

  if (!cameraId) {
    return (
      <Alert>
        <AlertDescription>Selecione uma câmera para configurar o envio de vídeo.</AlertDescription>
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Radio className="h-5 w-5 text-primary" />
          Enviar da câmera (RTMP)
        </CardTitle>
        <CardDescription>
          A câmera empurra o vídeo para o VISÃO. Não é preciso liberar portas no roteador
          nem ter IP fixo.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!endpoint && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Ative o modo de envio para gerar a URL e a chave de publicação desta câmera.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button onClick={() => void enablePush('rtmp_push')} disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Ativar RTMP
              </Button>
              <Button variant="outline" onClick={() => void enablePush('srt_push')} disabled={loading}>
                Ativar SRT
              </Button>
            </div>
          </div>
        )}

        {endpoint && publish && verdict && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={HEALTH_VARIANT[verdict.health]}>
                {INGEST_HEALTH_LABEL[verdict.health]}
              </Badge>
              <span className="text-xs text-muted-foreground">{verdict.reason}</span>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ingest-url">URL de publicação</Label>
              <div className="flex gap-2">
                <Input id="ingest-url" readOnly value={publish.url} className="font-mono text-xs" />
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Copiar URL de publicação"
                  onClick={() => void copy(publish.url, 'URL')}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ingest-key">Chave de publicação</Label>
              <div className="flex gap-2">
                <Input
                  id="ingest-key"
                  readOnly
                  value={revealed ? endpoint.stream_key : maskStreamKey(endpoint.stream_key)}
                  className="font-mono text-xs"
                />
                <Button
                  variant="outline"
                  size="icon"
                  aria-label={revealed ? 'Ocultar chave' : 'Mostrar chave'}
                  onClick={() => setRevealed((v) => !v)}
                >
                  {revealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Copiar chave de publicação"
                  onClick={() => void copy(endpoint.stream_key, 'Chave')}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Guarde como senha. Ao trocar a chave, a câmera para de publicar até ser
                reconfigurada.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button variant="outline" onClick={() => void rotateKey()} disabled={loading}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Gerar nova chave
              </Button>
              <Button
                variant="destructive"
                onClick={() => void revoke()}
                disabled={loading || endpoint.status === 'revoked'}
              >
                <ShieldOff className="mr-2 h-4 w-4" />
                Revogar acesso
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
