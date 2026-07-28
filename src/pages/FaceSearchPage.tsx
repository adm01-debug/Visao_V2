/**
 * Onda 197 — Busca de Faces (paridade SIM Next).
 *
 * O histórico facial existia e ninguém conseguia perguntar nada a ele. Esta
 * página é a pergunta: recorte de tempo, câmera, atributo e corte de
 * semelhança — com veredito honesto em cada leitura.
 */

import { PageContent } from '@/components/layout/MainLayout';
import { PageMeta } from '@/components/PageMeta';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { ScanSearch } from 'lucide-react';
import { FaceSearchFilters } from '@/components/faces/FaceSearchFilters';
import { FaceSearchResults } from '@/components/faces/FaceSearchResults';
import { ReferenceFaceMatchCard } from '@/components/faces/ReferenceFaceMatchCard';
import { useFaceSearch, MAX_ROWS } from '@/hooks/useFaceSearch';
import { describeRejection } from '@/lib/faces/faceSearch';

export default function FaceSearchPage() {
  const { criteria, rejection, results, summary, truncated, isFetching, error, submit, reset } =
    useFaceSearch();

  return (
    <PageContent className="container mx-auto space-y-6 p-4 md:p-6">
      <PageMeta
        title="Busca de faces | VISÃO"
        description="Pesquise leituras faciais por período, câmera, atributos estimados e corte de semelhança."
      />

      <header className="space-y-1">
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <ScanSearch className="h-6 w-6 text-primary" aria-hidden="true" />
          Busca de faces
        </h1>
        <p className="text-sm text-muted-foreground">
          Pergunte ao histórico facial: quem passou, quando e com que grau de certeza.
        </p>
      </header>

      <ReferenceFaceMatchCard />

      <FaceSearchFilters isFetching={isFetching} onSubmit={submit} onReset={reset} />

      {rejection !== null && (
        <Alert variant="destructive">
          <AlertTitle>Busca não realizada</AlertTitle>
          <AlertDescription>{describeRejection(rejection)}</AlertDescription>
        </Alert>
      )}

      {error !== null && (
        <Alert variant="destructive">
          <AlertTitle>Falha ao consultar o histórico</AlertTitle>
          <AlertDescription>
            A consulta não chegou ao fim — o resultado é indeterminado, não vazio.
          </AlertDescription>
        </Alert>
      )}

      {truncated && (
        <Alert>
          <AlertTitle>Resultado truncado</AlertTitle>
          <AlertDescription>
            Mostrando as {MAX_ROWS} leituras mais recentes do período. Estreite a janela para ver o
            restante.
          </AlertDescription>
        </Alert>
      )}

      {criteria !== null && (
        <Card>
          <CardContent className="grid grid-cols-2 gap-4 p-4 text-sm md:grid-cols-5">
            <div>
              <p className="text-xs text-muted-foreground">Leituras</p>
              <p className="text-lg font-semibold">{summary.total}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Identificadas</p>
              <p className="text-lg font-semibold text-success">{summary.identified}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Candidatas</p>
              <p className="text-lg font-semibold text-warning">{summary.candidate}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Suspeitas de fraude</p>
              <p className="text-lg font-semibold text-destructive">{summary.spoofSuspect}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Não conferidas</p>
              <p className="text-lg font-semibold">{summary.unverified}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {criteria !== null && !isFetching && <FaceSearchResults results={results} />}
    </PageContent>
  );
}
