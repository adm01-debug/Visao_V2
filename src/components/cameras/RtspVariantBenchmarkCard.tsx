/**
 * VISÃO — Card "Testar todas as variantes RTSP".
 *
 * Percorre cada variante do perfil ONVIF detectado (ou dos templates da marca
 * selecionada), roda `validate-rtsp-stream` inline e mostra o ranking. O botão
 * "Aplicar melhor" preenche o formulário com a URL vencedora.
 */
import { useMemo, useState } from 'react';
import { Loader2, CheckCircle2, AlertTriangle, XCircle, Trophy, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  benchmarkVariants,
  type BenchmarkVariantInput,
  type BenchmarkVariantResult,
} from '@/lib/rtspVariantBenchmark';

interface Props {
  variants: BenchmarkVariantInput[];
  ctx: {
    host: string;
    port?: number;
    channel?: number;
    username?: string;
    password?: string;
  };
  disabledReason?: string | null;
  onApplyBest: (best: BenchmarkVariantResult) => void;
}

export function RtspVariantBenchmarkCard({ variants, ctx, disabledReason, onApplyBest }: Props) {
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<BenchmarkVariantResult[]>([]);
  const [ranAt, setRanAt] = useState<number | null>(null);

  const best = useMemo(() => results.find((r) => r.status === 'success') ?? null, [results]);

  const run = async () => {
    if (variants.length === 0) {
      toast.error('Nenhuma variante disponível para testar.');
      return;
    }
    if (!ctx.host.trim()) {
      toast.error('Informe o IP/host antes de testar.');
      return;
    }
    setRunning(true);
    setResults([]);
    try {
      const final = await benchmarkVariants(variants, ctx, (partial) => setResults(partial));
      setResults(final);
      setRanAt(Date.now());
      const winner = final.find((r) => r.status === 'success');
      if (winner) {
        toast.success(`Melhor variante: ${winner.templateLabel}`, {
          description:
            `Latência média ${Math.round(winner.avgLatencyMs ?? 0)} ms · ${winner.codec ?? 'codec ?'} ${winner.resolution ?? ''}`.trim(),
        });
      } else {
        toast.warning('Nenhuma variante respondeu com sucesso. Confira credenciais e rede.');
      }
    } catch (e) {
      toast.error('Falha ao rodar benchmark', {
        description: e instanceof Error ? e.message : 'erro desconhecido',
      });
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="rounded-md border bg-card p-3 space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <p className="text-sm font-medium">Testar todas as variantes</p>
          <p className="text-[11px] text-muted-foreground">
            Valida cada URL RTSP conhecida para {variants[0]?.brand ?? 'esta marca'} e ranqueia por
            sucesso, perda e latência.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[11px]">
            {variants.length} variantes
          </Badge>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={run}
            disabled={running || Boolean(disabledReason) || variants.length === 0}
            title={disabledReason ?? undefined}
          >
            {running ? (
              <>
                <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> Testando…
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5 mr-1" /> Testar todas
              </>
            )}
          </Button>
        </div>
      </div>

      {disabledReason && !running && (
        <p className="text-[11px] text-muted-foreground">{disabledReason}</p>
      )}

      {results.length > 0 && (
        <ul className="space-y-1.5">
          {results.map((r) => {
            const isBest = best && r.templateId === best.templateId;
            return (
              <li
                key={`${r.brand}-${r.templateId}`}
                className={`flex items-center justify-between gap-2 rounded-md border px-2 py-1.5 text-xs ${
                  isBest ? 'border-primary/60 bg-primary/5' : ''
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <StatusIcon status={r.status} />
                  <div className="min-w-0">
                    <p className="font-medium truncate">
                      {isBest && <Trophy className="h-3 w-3 inline mr-1 text-primary" />}
                      {r.templateLabel}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate" title={r.primaryUrl}>
                      {r.primaryUrl}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {r.avgLatencyMs !== null && r.avgLatencyMs !== undefined && (
                    <Badge variant="outline" className="text-[10px]">
                      {Math.round(r.avgLatencyMs)} ms
                    </Badge>
                  )}
                  {r.lossPct !== null && r.lossPct !== undefined && (
                    <Badge variant="outline" className="text-[10px]">
                      perda {r.lossPct.toFixed(0)}%
                    </Badge>
                  )}
                  {r.status === 'error' && r.errorMessage && (
                    <span
                      className="text-[10px] text-destructive max-w-[120px] truncate"
                      title={r.errorMessage}
                    >
                      {r.errorMessage}
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {best && (
        <div className="flex items-center justify-between pt-2 border-t">
          <p className="text-[11px] text-muted-foreground">
            Melhor: <span className="font-medium text-foreground">{best.templateLabel}</span>
          </p>
          <Button type="button" size="sm" onClick={() => onApplyBest(best)}>
            Aplicar melhor
          </Button>
        </div>
      )}

      {ranAt && results.length > 0 && !best && (
        <p className="text-[11px] text-destructive">
          Nenhuma variante bem-sucedida — revise credenciais, canal ou porta.
        </p>
      )}
    </div>
  );
}

function StatusIcon({ status }: { status: BenchmarkVariantResult['status'] }) {
  if (status === 'success') return <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />;
  if (status === 'warn') return <AlertTriangle className="h-3.5 w-3.5 text-warning shrink-0" />;
  return <XCircle className="h-3.5 w-3.5 text-destructive shrink-0" />;
}

export default RtspVariantBenchmarkCard;
