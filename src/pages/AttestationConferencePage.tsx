/**
 * Onda 202/203 — Conferência de atestado e de dossiê.
 *
 * Tela de destino de quem RECEBE prova. Ela não emite nada: cola-se o JSON — um
 * atestado avulso ou um dossiê inteiro —, o servidor reconfere cada corrente e
 * consulta o registro, e as réguas únicas `conferAttestation` (peça) e
 * `summarizeBatch` (conjunto) produzem o parecer.
 *
 * Duas decisões de UI que não podem ser revertidas:
 *  - Integridade e procedência aparecem como DOIS cartões, nunca como um selo
 *    único. Fundi-los faria "não consta" parecer "adulterado".
 *  - O cabeçalho do lote é o PIOR elemento, nunca a maioria. Nenhuma tela deste
 *    sistema exibirá "11 de 12 autênticos" como conclusão.
 */

import { useCallback, useMemo, useState } from 'react';
import { PageContent } from '@/components/layout/MainLayout';
import { PageMeta } from '@/components/PageMeta';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  FileSearch,
  ShieldCheck,
  ShieldAlert,
  HelpCircle,
  Loader2,
  FileWarning,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import {
  conferAttestation,
  describeConferenceOutcome,
  summarizeConferenceOutcome,
  type ConferenceResult,
  type ConferenceTone,
  type RegistryLookup,
} from '@/lib/faces/attestationConference';
import {
  contentFingerprint,
  describeCoverage,
  parseDossier,
  summarizeBatch,
  type BatchPiece,
  type BatchSummary,
} from '@/lib/faces/attestationBatch';
import {
  describeAttestationVerdict,
  describeCaveat,
  type TimelineAttestation,
} from '@/lib/faces/timelineAttestation';

const TONE_CLASS: Record<ConferenceTone, string> = {
  positive: 'border-success/50 bg-success/5 text-success',
  neutral: 'border-border bg-muted/30 text-foreground',
  warning: 'border-warning/50 bg-warning/5 text-warning',
  critical: 'border-destructive/50 bg-destructive/5 text-destructive',
};

interface VerifyResponse {
  intact: boolean;
  first_broken_index: number | null;
  root_matches: boolean;
  verdict_matches: boolean;
  recomputed_verdict: TimelineAttestation['verdict'];
  registry_status?: 'found' | 'absent' | 'unavailable';
  registered: boolean;
  registered_at: string | null;
  registered_by?: string | null;
}

async function conferOne(attestation: TimelineAttestation): Promise<ConferenceResult> {
  const { data, error } = await supabase.functions.invoke<VerifyResponse>('timeline-attest', {
    body: { action: 'verify', attestation },
  });
  if (error || !data) throw new Error(error?.message ?? 'Sem resposta do servidor.');

  // Compatibilidade: resposta antiga sem `registry_status` só distingue achado
  // de não-achado; nunca inferimos "indisponível" a partir dela.
  const status = data.registry_status ?? (data.registered ? 'found' : 'absent');
  const registry: RegistryLookup =
    status === 'found'
      ? {
          status: 'found',
          issuedAt: data.registered_at ?? attestation.issuance.issuedAtUtc,
          issuedBy: data.registered_by ?? null,
        }
      : status === 'unavailable'
        ? { status: 'unavailable', reason: 'o registro não respondeu' }
        : { status: 'absent' };

  return conferAttestation({
    attestation,
    verification: {
      intact: data.intact,
      firstBrokenIndex: data.first_broken_index,
      rootMatches: data.root_matches,
      verdictMatches: data.verdict_matches,
      recomputedVerdict: data.recomputed_verdict,
    },
    registry,
  });
}

interface ConferenceState {
  readonly pieces: readonly BatchPiece[];
  readonly summary: BatchSummary;
  readonly documents: ReadonlyMap<number, TimelineAttestation>;
  readonly single: boolean;
}

export default function AttestationConferencePage() {
  const [raw, setRaw] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<ConferenceState | null>(null);

  const handleConfer = useCallback(async () => {
    setError(null);
    setState(null);

    let parsed: ReturnType<typeof parseDossier>;
    try {
      parsed = parseDossier(raw);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'JSON inválido.');
      return;
    }

    setBusy(true);
    try {
      const pieces: BatchPiece[] = [];
      const documents = new Map<number, TimelineAttestation>();

      for (const entry of parsed.entries) {
        if (entry.kind === 'unreadable') {
          pieces.push({ kind: 'unreadable', index: entry.index, reason: entry.reason });
          continue;
        }
        // Falha de rede em UMA peça não pode derrubar o parecer das outras:
        // ela vira peça não conferida, jamais peça acusada.
        try {
          const result = await conferOne(entry.attestation);
          pieces.push({
            kind: 'conferred',
            index: entry.index,
            rootHash: entry.attestation.rootHash,
            fingerprint: contentFingerprint(entry.attestation),
            result,
          });
          documents.set(entry.index, entry.attestation);
        } catch (e) {
          pieces.push({
            kind: 'unreadable',
            index: entry.index,
            reason: `não foi possível conferir (${e instanceof Error ? e.message : 'erro'})`,
          });
        }
      }

      setState({
        pieces,
        summary: summarizeBatch(pieces),
        documents,
        single: parsed.single,
      });
    } finally {
      setBusy(false);
    }
  }, [raw]);

  const soleDoc = useMemo(() => {
    if (!state || !state.single) return null;
    return state.documents.get(1) ?? null;
  }, [state]);

  const solePiece = useMemo(() => {
    if (!state || !state.single) return null;
    const p = state.pieces[0];
    return p && p.kind === 'conferred' ? p : null;
  }, [state]);

  const caveats = useMemo(() => soleDoc?.caveats.filter((c) => c.count > 0) ?? [], [soleDoc]);

  return (
    <PageContent className="container mx-auto space-y-6 p-4 md:p-6">
      <PageMeta
        title="Conferência de atestado | VISÃO"
        description="Confira a integridade e a procedência de atestados de trajetória recebidos de terceiro."
      />

      <header className="space-y-1">
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <FileSearch className="h-6 w-6 text-primary" aria-hidden="true" />
          Conferência de atestado
        </h1>
        <p className="text-sm text-muted-foreground">
          Cole um atestado ou um dossiê inteiro. A conferência responde duas perguntas separadas: o
          documento confere consigo mesmo e o selo consta no registro de origem.
        </p>
      </header>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Documento recebido</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            placeholder='{ "format": "visao.timeline.attestation", ... } ou [ {...}, {...} ]'
            className="min-h-[180px] font-mono text-xs"
            aria-label="Conteúdo do atestado em JSON"
          />
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleConfer} disabled={busy || raw.trim().length === 0}>
              {busy ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <ShieldCheck className="mr-2 h-4 w-4" aria-hidden="true" />
              )}
              Conferir
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setRaw('');
                setState(null);
                setError(null);
              }}
              disabled={busy}
            >
              Limpar
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" aria-hidden="true" />
          <AlertTitle>Conferência não concluída</AlertTitle>
          <AlertDescription>
            {error} Isto não diz nada sobre a autenticidade do documento.
          </AlertDescription>
        </Alert>
      )}

      {busy && <Skeleton className="h-40 w-full" />}

      {state && !busy && (
        <div className="space-y-4" aria-live="polite">
          <Card className={cn('border-2', TONE_CLASS[state.summary.tone])}>
            <CardContent className="space-y-2 p-5">
              <p className="text-lg font-semibold">
                {state.summary.headline
                  ? describeConferenceOutcome(state.summary.headline)
                  : 'Nada foi conferido'}
              </p>
              {state.summary.headline && (
                <p className="text-sm opacity-90">
                  {summarizeConferenceOutcome(state.summary.headline)}
                </p>
              )}
              <ul className="mt-2 space-y-1 text-sm text-foreground/80">
                {state.summary.reasons.map((reason) => (
                  <li key={reason} className="flex gap-2">
                    <span aria-hidden="true">•</span>
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
              {!state.single && (
                <p className="pt-1 text-xs text-muted-foreground">
                  {describeCoverage(state.summary.coverage)} — a conclusão do dossiê é a da peça
                  mais grave, nunca a da maioria.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Peças do dossiê (só quando há mais de uma) */}
          {!state.single && state.pieces.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Peças do dossiê ({state.summary.conferred} conferida(s) de {state.summary.total})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {state.pieces.map((p) => (
                  <div
                    key={p.index}
                    className={cn(
                      'flex flex-col gap-1 rounded-md border p-3 text-sm md:flex-row md:items-center md:justify-between',
                      p.kind === 'conferred' ? TONE_CLASS[p.result.tone] : 'border-dashed'
                    )}
                  >
                    <span className="flex items-center gap-2 font-medium">
                      {p.kind === 'unreadable' && (
                        <FileWarning className="h-4 w-4" aria-hidden="true" />
                      )}
                      Peça {p.index}
                    </span>
                    <span className="text-xs md:text-sm">
                      {p.kind === 'conferred'
                        ? describeConferenceOutcome(p.result.outcome)
                        : `Não conferida — ${p.reason}`}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Detalhe da peça única */}
          {state.single && solePiece && (
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Integridade do arquivo
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p
                    className={cn(
                      'text-base font-semibold',
                      solePiece.result.documentIntact ? 'text-success' : 'text-destructive'
                    )}
                  >
                    {solePiece.result.documentIntact
                      ? 'Confere com o selo'
                      : 'Não confere com o selo'}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Verificado por recálculo da corrente, sem consultar o banco.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Procedência
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p
                    className={cn(
                      'flex items-center gap-2 text-base font-semibold',
                      solePiece.result.originConfirmed ? 'text-success' : 'text-muted-foreground'
                    )}
                  >
                    {!solePiece.result.originConfirmed && (
                      <HelpCircle className="h-4 w-4" aria-hidden="true" />
                    )}
                    {solePiece.result.originConfirmed
                      ? 'Selo localizado no registro'
                      : 'Selo não confirmado neste registro'}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Eixo independente da integridade: um não substitui o outro.
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {state.single && soleDoc && solePiece && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Conteúdo atestado
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>
                  <span className="font-medium">Conclusão do documento: </span>
                  {describeAttestationVerdict(solePiece.result.documentVerdict)}
                </p>
                <p className="text-xs text-muted-foreground">
                  A conferência atesta autenticidade, não conteúdo: um atestado autêntico pode ser
                  contestado.
                </p>
                {caveats.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {caveats.map((c) => (
                      <Badge key={c.code} variant="outline">
                        {describeCaveat(c.code)} ({c.count})
                      </Badge>
                    ))}
                  </div>
                )}
                <dl className="grid grid-cols-2 gap-2 pt-2 text-xs text-muted-foreground">
                  <div>
                    <dt className="font-medium text-foreground">Permanências</dt>
                    <dd>{soleDoc.stats.stays}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-foreground">Câmeras</dt>
                    <dd>{soleDoc.stats.camerasVisited}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-foreground">Emitido em</dt>
                    <dd>{soleDoc.issuance.issuedAtUtc}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-foreground">Selo</dt>
                    <dd className="break-all font-mono">{soleDoc.rootHash.slice(0, 24)}…</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </PageContent>
  );
}
