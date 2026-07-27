/**
 * Onda 159 — Registro probatório.
 *
 * A Onda 158 passou a selar no servidor; sem esta tela ninguém conseguia
 * CONFERIR um selo depois — a prova existia no banco e era invisível.
 */

import { PageContent } from '@/components/layout/MainLayout';
import { PageMeta } from '@/components/PageMeta';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FileCheck2, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEvidenceExports } from '@/hooks/useEvidenceExports';
import { EvidenceExportsTable } from '@/components/evidence/EvidenceExportsTable';
import { DossierVerifierCard } from '@/components/evidence/DossierVerifierCard';
import { toast } from '@/hooks/use-toast';
import type { Tone } from '@/lib/evidence/exportRegistryView';

const HEADLINE_CLASS: Record<Tone, string> = {
  neutral: 'border-border',
  positive: 'border-success/40 text-success',
  warning: 'border-warning/40 text-warning',
  critical: 'border-destructive/40 text-destructive',
};

export default function EvidenceExportsPage() {
  const {
    views,
    summary,
    isLoading,
    error,
    refetch,
    verify,
    verifyAll,
    isVerifyingAll,
    downloadDossier,
    downloadingId,
  } = useEvidenceExports();


  return (
    <PageContent className="container mx-auto space-y-6 p-4 md:p-6">
      <PageMeta
        title="Registro probatório | VISÃO"
        description="Consulte as exportações de vídeo seladas e confira a corrente de custódia de cada uma no servidor."
      />

      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <FileCheck2 className="h-6 w-6 text-primary" aria-hidden="true" />
            Registro probatório
          </h1>
          <p className="text-sm text-muted-foreground">
            Exportações seladas e conferência da corrente de custódia.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={refetch} disabled={isLoading}>
            <RefreshCw className={cn('mr-2 h-4 w-4', isLoading && 'animate-spin')} aria-hidden="true" />
            Recarregar
          </Button>
          <Button onClick={() => void verifyAll()} disabled={isVerifyingAll || views.length === 0}>
            {isVerifyingAll ? 'Conferindo…' : 'Conferir todas'}
          </Button>
        </div>
      </header>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Falha ao carregar o registro</AlertTitle>
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}

      <Card className={cn('border-2', HEADLINE_CLASS[summary.headlineTone])}>
        <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
          <p className="text-sm font-medium" aria-live="polite">
            {summary.headlineMessage}
          </p>
          <dl className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
            <div className="flex gap-1">
              <dt>Total:</dt>
              <dd className="font-semibold text-foreground">{summary.total}</dd>
            </div>
            <div className="flex gap-1">
              <dt>Íntegras:</dt>
              <dd className="font-semibold text-foreground">{summary.verified}</dd>
            </div>
            <div className="flex gap-1">
              <dt>Não conferidas:</dt>
              <dd className="font-semibold text-foreground">{summary.unverified}</dd>
            </div>
            <div className="flex gap-1">
              <dt>Adulteradas:</dt>
              <dd className="font-semibold text-foreground">{summary.tampered}</dd>
            </div>
            <div className="flex gap-1">
              <dt>Indeterminadas:</dt>
              <dd className="font-semibold text-foreground">{summary.indeterminate}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <EvidenceExportsTable
        views={views}
        isLoading={isLoading}
        onVerify={(id) => void verify(id)}
        downloadingId={downloadingId}
        onDownloadDossier={(id) => {
          void downloadDossier(id).then((r) => {
            toast({
              title: r.ok ? 'Dossiê emitido' : 'Falha ao emitir dossiê',
              description: r.message,
              variant: r.ok ? 'default' : 'destructive',
            });
          });
        }}
      />

      <DossierVerifierCard />

    </PageContent>
  );
}
