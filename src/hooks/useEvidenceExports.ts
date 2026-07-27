/**
 * Onda 159 — leitura do registro probatório e conferência sob demanda.
 *
 * A listagem vem direto da tabela (sob a RLS do chamador). A conferência NÃO:
 * ela passa obrigatoriamente pela edge function `evidence-seal`, porque
 * recalcular a corrente no navegador seria pedir ao suspeito que assine o
 * próprio álibi — o código do cliente é substituível pelo operador.
 */

import { useCallback, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import {
  outcomeFromFailure,
  outcomeFromVerify,
  sortForReview,
  summarize,
  toExportView,
  type EvidenceExportRow,
  type EvidenceExportView,
  type RegistrySummary,
  type VerificationOutcome,
  type VerifyResponse,
} from '@/lib/evidence/exportRegistryView';
import {
  buildDossier,
  dossierFileName,
  serializeDossier,
} from '@/lib/evidence/custodyDossier';
import type { CustodyManifest } from '@/lib/evidence/custodyManifest';

const LIST_LIMIT = 200;

/** Download local: o dossiê nunca transita por terceiros para ser entregue. */
function triggerDownload(content: string, fileName: string): void {
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}


async function fetchExports(): Promise<EvidenceExportRow[]> {
  const { data, error } = await supabase
    .from('evidence_exports')
    .select('id, export_id, camera_id, root_hash, verdict, coverage_ratio, segment_count, gap_count, sealed_at')
    .order('sealed_at', { ascending: false })
    .limit(LIST_LIMIT);

  if (error) throw error;
  return (data ?? []) as EvidenceExportRow[];
}

/** Extrai o código de erro da resposta da função sem confundir com falha de rede. */
async function readErrorCode(error: unknown): Promise<{ code: string | null; detail: string }> {
  const context = (error as { context?: unknown })?.context;
  if (context instanceof Response) {
    try {
      const body = (await context.clone().json()) as { error?: string; detail?: string };
      return {
        code: typeof body.error === 'string' ? body.error : null,
        detail: body.detail ?? body.error ?? `HTTP ${context.status}`,
      };
    } catch {
      return { code: null, detail: `HTTP ${context.status}` };
    }
  }
  return { code: null, detail: error instanceof Error ? error.message : 'falha de comunicação' };
}

export interface DossierDownloadResult {
  readonly ok: boolean;
  readonly message: string;
}

interface UseEvidenceExportsReturn {
  readonly views: readonly EvidenceExportView[];
  readonly summary: RegistrySummary;
  readonly isLoading: boolean;
  readonly error: Error | null;
  readonly refetch: () => void;
  readonly verify: (exportId: string) => Promise<void>;
  readonly verifyAll: () => Promise<void>;
  readonly isVerifyingAll: boolean;
  /** Onda 160 — baixa o dossiê portátil para entrega a terceiros. */
  readonly downloadDossier: (exportId: string) => Promise<DossierDownloadResult>;
  readonly downloadingId: string | null;
}

export function useEvidenceExports(): UseEvidenceExportsReturn {
  const [outcomes, setOutcomes] = useState<Record<string, VerificationOutcome>>({});
  const [isVerifyingAll, setIsVerifyingAll] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);


  const query = useQuery({
    queryKey: ['evidence-exports'],
    queryFn: fetchExports,
    staleTime: 30_000,
  });

  const verify = useCallback(async (exportId: string) => {
    setOutcomes((prev) => ({ ...prev, [exportId]: { status: 'checking' } }));
    const checkedAtMs = Date.now();
    try {
      const { data, error } = await supabase.functions.invoke('evidence-seal', {
        body: { action: 'verify', export_id: exportId },
      });
      if (error) {
        const { code, detail } = await readErrorCode(error);
        setOutcomes((prev) => ({ ...prev, [exportId]: outcomeFromFailure(code, detail, checkedAtMs) }));
        return;
      }
      setOutcomes((prev) => ({
        ...prev,
        [exportId]: outcomeFromVerify(data as VerifyResponse, checkedAtMs),
      }));
    } catch (e) {
      logger.error('Falha ao conferir exportação probatória', { exportId, error: String(e) });
      setOutcomes((prev) => ({
        ...prev,
        [exportId]: outcomeFromFailure(null, e instanceof Error ? e.message : 'erro inesperado', checkedAtMs),
      }));
    }
  }, []);

  const verifyAll = useCallback(async () => {
    const rows = query.data ?? [];
    setIsVerifyingAll(true);
    try {
      // Sequencial de propósito: uma rajada de 200 chamadas simultâneas
      // produziria timeouts que a regra classificaria como "indeterminado" —
      // ruído que esconde o único sinal que importa.
      for (const row of rows) {
        await verify(row.export_id);
      }
    } finally {
      setIsVerifyingAll(false);
    }
  }, [query.data, verify]);

  const downloadDossier = useCallback(async (exportId: string): Promise<DossierDownloadResult> => {
    setDownloadingId(exportId);
    try {
      const { data, error } = await supabase.functions.invoke('evidence-seal', {
        body: { action: 'dossier', export_id: exportId },
      });
      if (error) {
        const { code, detail } = await readErrorCode(error);
        const message =
          code === 'seal_broken'
            ? 'Recusado: a exportação guardada não confere com o próprio selo.'
            : code === 'export_not_found'
              ? 'Exportação não encontrada no registro.'
              : `Não foi possível emitir o dossiê: ${detail}`;
        return { ok: false, message };
      }

      const payload = data as {
        manifest: CustodyManifest;
        issued_at_utc: string;
        issued_by: string;
        source_system: string;
      };

      const dossier = buildDossier(payload.manifest, {
        issuedAtUtc: payload.issued_at_utc,
        issuedBy: payload.issued_by,
        sourceSystem: payload.source_system,
      });

      triggerDownload(serializeDossier(dossier), dossierFileName(dossier));
      return { ok: true, message: `Dossiê ${dossierFileName(dossier)} emitido.` };
    } catch (e) {
      logger.error('Falha ao emitir dossiê probatório', { exportId, error: String(e) });
      return { ok: false, message: e instanceof Error ? e.message : 'erro inesperado' };
    } finally {
      setDownloadingId(null);
    }
  }, []);

  const views = useMemo(
    () => sortForReview((query.data ?? []).map((row) => toExportView(row, outcomes[row.export_id]))),
    [query.data, outcomes],
  );

  const summary = useMemo(() => summarize(views), [views]);

  return {
    views,
    summary,
    isLoading: query.isLoading,
    error: (query.error as Error) ?? null,
    refetch: () => void query.refetch(),
    verify,
    verifyAll,
    isVerifyingAll,
    downloadDossier,
    downloadingId,
  };
}

