/**
 * Linha da tabela de jobs de download — busca signed URL sob demanda,
 * permite cancelar (via edge function) e re-tentar.
 */
import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Download, Loader2, RefreshCw, XCircle, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface DownloadRow {
  id: string;
  camera_id?: string | null;
  camera_name?: string;
  channel: number;
  start_time: string;
  end_time: string;
  status: 'pending' | 'listing' | 'downloading' | 'completed' | 'failed' | 'canceled';
  progress_percent: number;
  bytes_downloaded: number;
  total_bytes: number | null;
  attempts: number;
  max_attempts: number;
  last_error: string | null;
  storage_bucket: string;
  storage_path: string | null;
  created_at: string;
  started_at?: string | null;
  updated_at?: string | null;
}

const STATUS: Record<DownloadRow['status'], { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending:     { label: 'Aguardando',   variant: 'outline' },
  listing:     { label: 'Consultando',  variant: 'secondary' },
  downloading: { label: 'Baixando',     variant: 'secondary' },
  completed:   { label: 'Concluído',    variant: 'default' },
  failed:      { label: 'Falhou',       variant: 'destructive' },
  canceled:    { label: 'Cancelado',    variant: 'outline' },
};

function formatBytes(bytes: number | null | undefined): string {
  if (!bytes) return '—';
  const units = ['B', 'KiB', 'MiB', 'GiB'];
  let v = bytes;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i += 1;
  }
  return `${v.toFixed(v >= 100 ? 0 : 1)} ${units[i]}`;
}

function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '—';
  const s = Math.round(seconds);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m < 60) return `${m}m ${r.toString().padStart(2, '0')}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${(m % 60).toString().padStart(2, '0')}m`;
}

interface Props {
  row: DownloadRow;
  onRetry: (row: DownloadRow) => void;
  onCancel: (id: string) => void;
}

export function NvrDownloadJobRow({ row, onRetry, onCancel }: Props) {
  const [openingUrl, setOpeningUrl] = useState(false);

  const handleDownload = async () => {
    if (!row.storage_path) return;
    setOpeningUrl(true);
    try {
      const { data, error } = await supabase.storage
        .from(row.storage_bucket)
        .createSignedUrl(row.storage_path, 60 * 10);
      if (error || !data?.signedUrl) throw error ?? new Error('URL indisponível');
      window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
    } catch (e) {
      toast.error('Não foi possível gerar link de download.');
      if (import.meta.env.DEV) console.error(e);
    } finally {
      setOpeningUrl(false);
    }
  };

  const meta = STATUS[row.status];
  const inFlight = row.status === 'downloading' || row.status === 'listing' || row.status === 'pending';

  return (
    <tr className="border-b border-border/60 last:border-0">
      <td className="p-3 align-top">
        <div className="font-medium text-foreground">{row.camera_name ?? `Canal ${row.channel}`}</div>
        <div className="text-xs text-muted-foreground">Canal {row.channel}</div>
      </td>
      <td className="p-3 align-top text-xs text-muted-foreground">
        <div>{new Date(row.start_time).toLocaleString('pt-BR')}</div>
        <div>até {new Date(row.end_time).toLocaleString('pt-BR')}</div>
      </td>
      <td className="p-3 align-top">
        <Badge variant={meta.variant} className="gap-1">
          {inFlight && <Loader2 className="h-3 w-3 animate-spin" />}
          {row.status === 'completed' && <CheckCircle2 className="h-3 w-3" />}
          {row.status === 'failed' && <AlertCircle className="h-3 w-3" />}
          {meta.label}
        </Badge>
        <div className="mt-1 text-[11px] text-muted-foreground">
          Tentativa {row.attempts}/{row.max_attempts}
        </div>
      </td>
      <td className="p-3 align-top">
        <div className="w-40">
          <Progress value={Math.round(row.progress_percent)} className="h-2" />
          <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
            <span>{Math.round(row.progress_percent)}%</span>
            <span>
              {formatBytes(row.bytes_downloaded)}
              {row.total_bytes ? ` / ${formatBytes(row.total_bytes)}` : ''}
            </span>
          </div>
        </div>
        {row.last_error && (
          <div className="mt-1 max-w-[16rem] truncate text-[11px] text-destructive" title={row.last_error}>
            {row.last_error}
          </div>
        )}
      </td>
      <td className="p-3 align-top text-xs text-muted-foreground">
        {formatDistanceToNow(new Date(row.created_at), { locale: ptBR, addSuffix: true })}
      </td>
      <td className="p-3 align-top">
        <div className="flex flex-wrap justify-end gap-2">
          {row.status === 'completed' && row.storage_path && (
            <Button size="sm" variant="outline" onClick={handleDownload} disabled={openingUrl}>
              {openingUrl ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Download className="mr-1 h-3.5 w-3.5" />}
              Baixar
            </Button>
          )}
          {(row.status === 'failed' || row.status === 'canceled') && (
            <Button size="sm" variant="outline" onClick={() => onRetry(row)}>
              <RefreshCw className="mr-1 h-3.5 w-3.5" />
              Tentar novamente
            </Button>
          )}
          {inFlight && (
            <Button size="sm" variant="ghost" onClick={() => onCancel(row.id)}>
              <XCircle className="mr-1 h-3.5 w-3.5" />
              Cancelar
            </Button>
          )}
        </div>
      </td>
    </tr>
  );
}
