import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, ChevronUp, CheckCircle2, XCircle, PlayCircle, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { useRtspValidation, type ValidationResult } from '@/hooks/useRtspValidation';
import { toast } from 'sonner';

interface Props {
  cameraId: string;
}

interface HealthCheck {
  id: string;
  status: 'ok' | 'fail';
  latency_ms: number;
  http_code: number;
  message: string | null;
  created_at: string;
}

export function CameraTestHistoryCard({ cameraId }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const { validate, loading: validating } = useRtspValidation();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['camera-tests', cameraId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stream_health_checks')
        .select('id, status, latency_ms, http_code, message, created_at')
        .eq('camera_id', cameraId)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return (data ?? []) as HealthCheck[];
    },
    refetchInterval: 30_000,
  });

  const runValidation = async (target: 'primary' | 'substream') => {
    try {
      const r = await validate({ mode: 'camera', cameraId, target });
      setValidation(r);
      toast.success(`Validação ${target} concluída: ${r.score.toUpperCase()}`);
      refetch();
    } catch (e) {
      toast.error(`Falha: ${(e as Error).message}`);
    }
  };

  const latest = data?.[0];
  const isLatestExpanded = latest && expandedId === latest.id;

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm">Histórico de testes</CardTitle>
        <div className="flex gap-1">
          <Button size="sm" variant="outline" onClick={() => runValidation('primary')} disabled={validating}>
            {validating ? <Loader2 className="h-3 w-3 animate-spin" /> : <PlayCircle className="h-3 w-3" />}
            <span className="ml-1 text-xs">Principal</span>
          </Button>
          <Button size="sm" variant="outline" onClick={() => runValidation('substream')} disabled={validating}>
            <PlayCircle className="h-3 w-3" />
            <span className="ml-1 text-xs">Sub</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading ? (
          <>
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </>
        ) : !data || data.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">
            Sem testes registrados. Rode uma validação acima.
          </p>
        ) : (
          <div className="divide-y divide-border -my-1">
            {data.map((chk, idx) => {
              const isFirst = idx === 0;
              const isExpanded = expandedId === chk.id;
              const Icon = chk.status === 'ok' ? CheckCircle2 : XCircle;
              return (
                <div key={chk.id} className="py-2">
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : chk.id)}
                    className="w-full flex items-center justify-between gap-2 hover:bg-muted/50 rounded px-1 py-1 text-left"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Icon className={`h-3.5 w-3.5 shrink-0 ${chk.status === 'ok' ? 'text-emerald-500' : 'text-destructive'}`} />
                      <span className="text-xs truncate">
                        {formatDistanceToNow(new Date(chk.created_at), { addSuffix: true, locale: ptBR })}
                      </span>
                      {isFirst && <Badge variant="outline" className="text-[9px] h-4 px-1">último</Badge>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] text-muted-foreground">{chk.latency_ms} ms</span>
                      {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    </div>
                  </button>
                  {isExpanded && (
                    <div className="mt-2 px-1 space-y-1 text-[11px] text-muted-foreground">
                      <div className="flex justify-between"><span>Status</span><span className="font-medium">{chk.status.toUpperCase()}</span></div>
                      <div className="flex justify-between"><span>HTTP</span><span>{chk.http_code || '—'}</span></div>
                      <div className="flex justify-between"><span>Latência</span><span>{chk.latency_ms} ms</span></div>
                      {chk.message && (
                        <div className="pt-1">
                          <span className="block">Mensagem</span>
                          <code className="block bg-muted rounded px-1 py-0.5 text-[10px] break-all">{chk.message}</code>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {(validation || isLatestExpanded) && validation && (
          <>
            <Separator />
            <div className="space-y-1 text-[11px]">
              <div className="flex items-center justify-between">
                <span className="font-medium">Última validação RTSP</span>
                <Badge variant="outline" className={
                  validation.score === 'ok' ? 'text-emerald-500 border-emerald-500/30' :
                  validation.score === 'warn' ? 'text-amber-500 border-amber-500/30' :
                  'text-destructive border-destructive/30'
                }>{validation.score}</Badge>
              </div>
              <div className="flex justify-between text-muted-foreground"><span>Alvo</span><span>{validation.target}</span></div>
              <div className="flex justify-between text-muted-foreground"><span>Amostras</span><span>{validation.samples} · perda {validation.loss_pct}%</span></div>
              <div className="flex justify-between text-muted-foreground"><span>Latência (p95 / avg / jitter)</span><span>{validation.latency.p95} / {validation.latency.avg} / {validation.latency.jitter} ms</span></div>
              {validation.codec && <div className="flex justify-between text-muted-foreground"><span>Codec</span><span>{validation.codec} {validation.resolution ?? ''} {validation.fps ? `@${validation.fps}fps` : ''}</span></div>}
              {validation.auth_method && <div className="flex justify-between text-muted-foreground"><span>Auth</span><span>{validation.auth_method}</span></div>}
              {validation.suggestions.length > 0 && (
                <div className="pt-1">
                  <span className="block text-muted-foreground">Sugestões</span>
                  <ul className="mt-1 space-y-0.5">
                    {validation.suggestions.map((s) => (
                      <li key={s.code} className={
                        s.severity === 'critical' ? 'text-destructive' :
                        s.severity === 'warn' ? 'text-amber-500' :
                        'text-muted-foreground'
                      }>· {s.message}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
