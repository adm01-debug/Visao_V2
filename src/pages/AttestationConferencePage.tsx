/**
 * Onda 202 — Conferência de atestado de trajetória.
 *
 * Tela de destino de quem RECEBE um atestado. Ela não emite nada: cola-se o
 * JSON, o servidor reconfere a corrente e consulta o registro, e a régua única
 * `conferAttestation` produz o parecer.
 *
 * Decisão de UI que não pode ser revertida: integridade e procedência aparecem
 * como DOIS cartões, nunca como um selo único. Fundi-los faria "não consta"
 * parecer "adulterado" para um leitor apressado — exatamente o erro que a
 * Onda 159 corrigiu no registro de vídeo.
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
import { FileSearch, ShieldCheck, ShieldAlert, HelpCircle, Loader2 } from 'lucide-react';
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

function parseAttestation(raw: string): TimelineAttestation {
  const parsed = JSON.parse(raw) as Partial<TimelineAttestation>;
  if (
    !parsed ||
    typeof parsed !== 'object' ||
    typeof parsed.rootHash !== 'string' ||
    !Array.isArray(parsed.chain) ||
    !Array.isArray(parsed.stays)
  ) {
    throw new Error('O arquivo não tem a forma de um atestado de trajetória.');
  }
  return parsed as TimelineAttestation;
}

export default function AttestationConferencePage() {
  const [raw, setRaw] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [doc, setDoc] = useState<TimelineAttestation | null>(null);
  const [result, setResult] = useState<ConferenceResult | null>(null);

  const handleConfer = useCallback(async () => {
    setError(null);
    setResult(null);
    setDoc(null);

    let attestation: TimelineAttestation;
    try {
      attestation = parseAttestation(raw);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'JSON inválido.');
      return;
    }

    setBusy(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke<VerifyResponse>(
        'timeline-attest',
        { body: { action: 'verify', attestation } },
      );
      if (fnError || !data) throw new Error(fnError?.message ?? 'Sem resposta do servidor.');

      // Compatibilidade: resposta antiga sem `registry_status` só distingue
      // achado de não-achado; nunca inferimos "indisponível" a partir dela.
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

      setDoc(attestation);
      setResult(
        conferAttestation({
          attestation,
          verification: {
            intact: data.intact,
            firstBrokenIndex: data.first_broken_index,
            rootMatches: data.root_matches,
            verdictMatches: data.verdict_matches,
            recomputedVerdict: data.recomputed_verdict,
          },
          registry,
        }),
      );
    } catch (e) {
      // Falha ao conferir NUNCA é apresentada como resultado da conferência.
      setError(
        e instanceof Error
          ? `Não foi possível concluir a conferência: ${e.message}`
          : 'Não foi possível concluir a conferência.',
      );
    } finally {
      setBusy(false);
    }
  }, [raw]);

  const caveats = useMemo(() => doc?.caveats.filter((c) => c.count > 0) ?? [], [doc]);

  return (
    <PageContent className="container mx-auto space-y-6 p-4 md:p-6">
      <PageMeta
        title="Conferência de atestado | VISÃO"
        description="Confira a integridade e a procedência de um atestado de trajetória recebido de terceiro."
      />

      <header className="space-y-1">
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <FileSearch className="h-6 w-6 text-primary" aria-hidden="true" />
          Conferência de atestado
        </h1>
        <p className="text-sm text-muted-foreground">
          Cole o arquivo JSON recebido. A conferência responde duas perguntas separadas: o
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
            placeholder='{ "format": "visao.timeline.attestation", ... }'
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
              Conferir atestado
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setRaw('');
                setDoc(null);
                setResult(null);
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

      {busy && !result && <Skeleton className="h-40 w-full" />}

      {result && doc && (
        <div className="space-y-4" aria-live="polite">
          <Card className={cn('border-2', TONE_CLASS[result.tone])}>
            <CardContent className="space-y-2 p-5">
              <p className="text-lg font-semibold">
                {describeConferenceOutcome(result.outcome)}
              </p>
              <p className="text-sm opacity-90">
                {summarizeConferenceOutcome(result.outcome)}
              </p>
              <ul className="mt-2 space-y-1 text-sm text-foreground/80">
                {result.reasons.map((reason) => (
                  <li key={reason} className="flex gap-2">
                    <span aria-hidden="true">•</span>
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

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
                    result.documentIntact ? 'text-success' : 'text-destructive',
                  )}
                >
                  {result.documentIntact ? 'Confere com o selo' : 'Não confere com o selo'}
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
                    result.originConfirmed ? 'text-success' : 'text-muted-foreground',
                  )}
                >
                  {!result.originConfirmed && (
                    <HelpCircle className="h-4 w-4" aria-hidden="true" />
                  )}
                  {result.originConfirmed
                    ? 'Selo localizado no registro'
                    : 'Selo não confirmado neste registro'}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Eixo independente da integridade: um não substitui o outro.
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Conteúdo atestado
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>
                <span className="font-medium">Conclusão do documento: </span>
                {describeAttestationVerdict(result.documentVerdict)}
              </p>
              <p className="text-xs text-muted-foreground">
                A conferência atesta autenticidade, não conteúdo: um atestado autêntico pode
                ser contestado.
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
                  <dd>{doc.stats.stays}</dd>
                </div>
                <div>
                  <dt className="font-medium text-foreground">Câmeras</dt>
                  <dd>{doc.stats.camerasVisited}</dd>
                </div>
                <div>
                  <dt className="font-medium text-foreground">Emitido em</dt>
                  <dd>{doc.issuance.issuedAtUtc}</dd>
                </div>
                <div>
                  <dt className="font-medium text-foreground">Selo</dt>
                  <dd className="break-all font-mono">{doc.rootHash.slice(0, 24)}…</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </div>
      )}
    </PageContent>
  );
}
