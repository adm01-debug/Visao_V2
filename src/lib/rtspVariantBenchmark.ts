/**
 * VISÃO — Benchmark de variantes RTSP.
 *
 * Renderiza cada `RtspTemplate` do fabricante (ou do perfil ONVIF detectado)
 * com o host/porta/canal informados, dispara `validate-rtsp-stream` em modo
 * inline para cada URL com concorrência limitada e devolve um ranking
 * ordenado por sucesso, score, perda e latência média.
 *
 * Uso: assistente de cadastro de câmera oferece "Testar todas as variantes"
 * para escolher automaticamente a URL mais estável antes de salvar.
 */
import { supabase } from "@/integrations/supabase/client";
import type { RtspTemplate } from "./rtspTemplates";
import { renderTemplate } from "./rtspTemplates";
import type { ValidationResult } from "@/hooks/useRtspValidation";
import { buildRtspUrl } from "@/components/cameras/addCameraSchema";

export interface BenchmarkVariantInput {
  /** Marca canônica em `rtspTemplates.ts` (ex.: `xiongmai`, `hikvision`). */
  brand: string;
  /** Template a ser renderizado e testado. */
  template: RtspTemplate;
  /** Se veio marcado como recomendado pelo perfil ONVIF. */
  recommended?: boolean;
}

export interface BenchmarkContext {
  host: string;
  port?: number;
  channel?: number;
  username?: string;
  password?: string;
  /** Amostras por variante — padrão 2 para velocidade. */
  samples?: number;
  /** Requisições simultâneas — padrão 2 para não sobrecarregar o edge. */
  concurrency?: number;
}

export type BenchmarkStatus = "success" | "warn" | "failed" | "error";

export interface BenchmarkVariantResult {
  brand: string;
  templateId: string;
  templateLabel: string;
  primaryUrl: string;
  substreamUrl?: string;
  status: BenchmarkStatus;
  score: ValidationResult["score"] | null;
  avgLatencyMs: number | null;
  jitterMs: number | null;
  lossPct: number | null;
  codec: string | null;
  resolution: string | null;
  fps: number | null;
  recommended: boolean;
  /** Ordinal para desempate na UI (mesmo score/latência). */
  rank: number;
  errorMessage?: string;
}

const SCORE_ORDER: Record<NonNullable<ValidationResult["score"]>, number> = {
  ok: 0,
  warn: 1,
  critical: 2,
};

/**
 * Ordena resultados: sucessos primeiro, depois score (ok > warn > critical),
 * depois menor perda, depois menor latência média. Empates preservam a ordem
 * de recomendação do perfil.
 */
export function rankResults(items: BenchmarkVariantResult[]): BenchmarkVariantResult[] {
  const sorted = [...items].sort((a, b) => {
    if (a.status !== b.status) {
      const order: Record<BenchmarkStatus, number> = { success: 0, warn: 1, failed: 2, error: 3 };
      return order[a.status] - order[b.status];
    }
    const sa = a.score ? SCORE_ORDER[a.score] : 3;
    const sb = b.score ? SCORE_ORDER[b.score] : 3;
    if (sa !== sb) return sa - sb;
    const la = a.lossPct ?? Infinity;
    const lb = b.lossPct ?? Infinity;
    if (la !== lb) return la - lb;
    const ma = a.avgLatencyMs ?? Infinity;
    const mb = b.avgLatencyMs ?? Infinity;
    if (ma !== mb) return ma - mb;
    if (a.recommended !== b.recommended) return a.recommended ? -1 : 1;
    return 0;
  });
  return sorted.map((r, i) => ({ ...r, rank: i + 1 }));
}

async function validateOne(
  rtspUrl: string,
  ctx: BenchmarkContext,
): Promise<ValidationResult | { error: string }> {
  const finalUrl = buildRtspUrl(rtspUrl, ctx.username, ctx.password);
  const { data, error } = await supabase.functions.invoke("validate-rtsp-stream", {
    body: { rtsp_url: finalUrl, samples: ctx.samples ?? 2 },
  });
  if (error) return { error: error.message || "invoke_error" };
  if (!data) return { error: "empty_response" };
  return data as ValidationResult;
}

function toResult(
  variant: BenchmarkVariantInput,
  rendered: { primary: string; substream?: string },
  outcome: ValidationResult | { error: string },
): BenchmarkVariantResult {
  const base = {
    brand: variant.brand,
    templateId: variant.template.id,
    templateLabel: variant.template.label,
    primaryUrl: rendered.primary,
    substreamUrl: rendered.substream,
    recommended: Boolean(variant.recommended),
    rank: 0,
  };
  if ("error" in outcome) {
    return {
      ...base,
      status: "error",
      score: null,
      avgLatencyMs: null,
      jitterMs: null,
      lossPct: null,
      codec: null,
      resolution: null,
      fps: null,
      errorMessage: outcome.error,
    };
  }
  const status: BenchmarkStatus = outcome.ok
    ? outcome.score === "warn"
      ? "warn"
      : "success"
    : "failed";
  return {
    ...base,
    status,
    score: outcome.score,
    avgLatencyMs: outcome.latency?.avg ?? null,
    jitterMs: outcome.latency?.jitter ?? null,
    lossPct: outcome.loss_pct ?? null,
    codec: outcome.codec,
    resolution: outcome.resolution,
    fps: outcome.fps,
  };
}

/**
 * Executa o benchmark. `onProgress` é chamado ao final de cada variante para
 * a UI atualizar a lista incrementalmente.
 */
export async function benchmarkVariants(
  variants: BenchmarkVariantInput[],
  ctx: BenchmarkContext,
  onProgress?: (partial: BenchmarkVariantResult[]) => void,
): Promise<BenchmarkVariantResult[]> {
  const host = ctx.host.trim();
  if (!host) throw new Error("host_required");

  const concurrency = Math.max(1, Math.min(4, ctx.concurrency ?? 2));
  const results: BenchmarkVariantResult[] = [];
  let cursor = 0;

  const runNext = async (): Promise<void> => {
    const idx = cursor++;
    if (idx >= variants.length) return;
    const variant = variants[idx];
    if (!variant) return;
    const rendered = renderTemplate(variant.template, {
      host,
      port: ctx.port,
      channel: ctx.channel,
    });
    let outcome: ValidationResult | { error: string };
    try {
      outcome = await validateOne(rendered.primary, ctx);
    } catch (e) {
      outcome = { error: e instanceof Error ? e.message : "unknown_error" };
    }
    results.push(toResult(variant, rendered, outcome));
    onProgress?.(rankResults(results));
    await runNext();
  };

  const workers = Array.from({ length: Math.min(concurrency, variants.length) }, () => runNext());
  await Promise.all(workers);
  return rankResults(results);
}
