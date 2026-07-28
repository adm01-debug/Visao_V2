/**
 * Onda 200 — Atestado de trajetória (emissão e leitura).
 *
 * Espelho visual da régua `timelineAttestation`: a tela não recalcula veredito,
 * não esconde ressalva e não promete mais do que o documento prova.
 */

import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { FileSignature, Download, AlertTriangle, ShieldQuestion } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { FaceSearchResult } from '@/lib/faces/faceSearch';
import { buildPersonTimeline } from '@/lib/faces/personTimeline';
import {
  assessTimeline,
  buildTimelineAttestation,
  describeAttestationVerdict,
  describeCaveat,
  type AttestationVerdict,
} from '@/lib/faces/timelineAttestation';

export interface TimelineAttestationCardProps {
  readonly results: readonly FaceSearchResult[];
  readonly windowEndMs: number;
  readonly windowStartMs: number;
  /** Pessoa investigada; `null` quando a busca foi por imagem de referência. */
  readonly personId?: string | null;
  readonly personLabel?: string | null;
}

const VERDICT_VARIANT: Record<AttestationVerdict, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  corroborated: 'default',
  partial: 'secondary',
  contested: 'destructive',
  inconclusive: 'outline',
};

export function TimelineAttestationCard({
  results,
  windowEndMs,
  windowStartMs,
  personId = null,
  personLabel = null,
}: TimelineAttestationCardProps) {
  const [issuing, setIssuing] = useState(false);

  const timeline = useMemo(
    () => buildPersonTimeline(results, windowEndMs),
    [results, windowEndMs],
  );

  const subject = useMemo(() => ({ personId, label: personLabel }), [personId, personLabel]);

  const { verdict, caveats } = useMemo(
    () => assessTimeline(timeline, subject),
    [timeline, subject],
  );

  /**
   * Onda 201 — a emissão passou a ser um ato do servidor. Autoria, relógio e
   * identificador não saem mais do navegador (um documento cuja procedência o
   * próprio cliente escreve não prova procedência), e o selo fica registrado
   * para conferência futura contra a origem.
   */
  const handleIssue = async (): Promise<void> => {
    setIssuing(true);
    try {
      const { data, error } = await supabase.functions.invoke('timeline-attest', {
        body: {
          action: 'issue',
          timeline,
          subject,
          window: {
            fromUtc: new Date(windowStartMs).toISOString(),
            toUtc: new Date(windowEndMs).toISOString(),
          },
        },
      });
      if (error) throw error;

      const attestation = (data as { attestation?: TimelineAttestation } | null)?.attestation;
      if (!attestation) throw new Error('O servidor não devolveu o atestado.');

      const blob = new Blob([JSON.stringify(attestation, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `atestado-trajetoria-${attestation.attestationId}.json`;
      link.click();
      URL.revokeObjectURL(url);

      toast.success('Atestado emitido e registrado', {
        description: `Selo ${attestation.rootHash.slice(0, 12)}… — ${describeAttestationVerdict(
          attestation.verdict,
        )}.`,
      });
    } catch (error) {
      toast.error('Não foi possível emitir o atestado', {
        description: error instanceof Error ? error.message : 'Falha desconhecida.',
      });
    } finally {
      setIssuing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FileSignature className="h-4 w-4 text-primary" aria-hidden="true" />
          Atestado de trajetória
        </CardTitle>
        <CardDescription>
          Documento JSON encadeado por SHA-256 que um terceiro consegue reconferir sem acesso ao
          sistema. Registra uma leitura automatizada — não substitui a gravação original.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={VERDICT_VARIANT[verdict]}>{describeAttestationVerdict(verdict)}</Badge>
          <span className="text-xs text-muted-foreground">
            {timeline.stays.length} permanência(s) · {timeline.camerasVisited} câmera(s)
          </span>
        </div>

        {verdict === 'contested' && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            <AlertTitle>Trajetória contestada</AlertTitle>
            <AlertDescription>
              Há contradição interna nas leituras. O atestado pode ser emitido, mas sai marcado como
              contestado — o conflito não é removido do documento.
            </AlertDescription>
          </Alert>
        )}

        {verdict === 'inconclusive' && (
          <Alert>
            <ShieldQuestion className="h-4 w-4" aria-hidden="true" />
            <AlertTitle>Sem observação na janela</AlertTitle>
            <AlertDescription>
              Nenhuma permanência foi afirmada. Isso não significa que a pessoa não esteve no local:
              câmera cega e pessoa ausente produzem o mesmo vazio.
            </AlertDescription>
          </Alert>
        )}

        {caveats.length > 0 && (
          <ul className="space-y-1 text-xs text-muted-foreground">
            {caveats.map((caveat) => (
              <li key={caveat.code}>
                <span className="font-medium text-foreground">{describeCaveat(caveat.code)}</span>
                {caveat.count > 1 ? ` (${caveat.count})` : ''} — {caveat.detail}
              </li>
            ))}
          </ul>
        )}

        <Button
          onClick={() => void handleIssue()}
          disabled={issuing}
          className="w-full sm:w-auto"
        >
          <Download className="mr-2 h-4 w-4" aria-hidden="true" />
          {issuing ? 'Emitindo…' : 'Emitir atestado (JSON)'}
        </Button>

        <p className="text-xs text-muted-foreground">
          O selo demonstra que o arquivo não foi editado após a emissão; ele não impede que um
          documento seja fabricado do zero. Confira o selo contra o registro do sistema de origem.
        </p>
      </CardContent>
    </Card>
  );
}
