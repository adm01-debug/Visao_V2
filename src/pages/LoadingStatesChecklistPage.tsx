/**
 * /dev/loading-states — Checklist visual dos estados de carregamento
 * para validação rápida de UX (DEV/QA).
 *
 * Cobre:
 *   1. Loading skeletons branded (CamerasSkeleton, AlertsSkeleton, ZonesSkeleton)
 *   2. Skeleton primitivos por contexto (cards, table, filters, page, inline)
 *   3. Error fallback (skeleton branded lança no render)
 *   4. Lazy chunk falhou (Promise.reject no import dinâmico)
 *
 * Acesso: rota interna /dev/loading-states (apenas autenticados).
 */
import { useMemo, useState } from 'react';
import { CheckCircle2, Circle, RefreshCw, AlertTriangle } from 'lucide-react';
import { PageMeta } from '@/components/PageMeta';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CamerasSkeleton } from '@/components/skeletons/CamerasSkeleton';
import { AlertsSkeleton } from '@/components/skeletons/AlertsSkeleton';
import { ZonesSkeleton } from '@/components/skeletons/ZonesSkeleton';
import {
  SkeletonFallback,
  type SkeletonFallbackVariant,
} from '@/components/skeletons/SkeletonFallback';
import { SkeletonErrorBoundary } from '@/components/skeletons/SkeletonErrorBoundary';
import {
  getSkeletonFailureMode,
  setSkeletonFailureMode,
  type SkeletonFailureMode,
} from '@/lib/skeletonFailureFlag';
import { cn } from '@/lib/utils';
import { PageContent } from '@/components/layout/MainLayout';

interface ChecklistItem {
  id: string;
  label: string;
  hint: string;
}

const CHECKLIST: ChecklistItem[] = [
  {
    id: 'cameras-skel',
    label: 'CamerasSkeleton — grid 16/9 com aspect-ratio reservado',
    hint: '8 cards, sem CLS ao trocar para dados reais',
  },
  {
    id: 'alerts-skel',
    label: 'AlertsSkeleton — stats + lista',
    hint: 'Cards de stats + linhas com min-h fixo',
  },
  {
    id: 'zones-skel',
    label: 'ZonesSkeleton — header + tabela + grid',
    hint: 'Filtros e tabs preservados',
  },
  {
    id: 'fb-page',
    label: 'SkeletonFallback variant="page"',
    hint: 'Bloco vertical genérico (default)',
  },
  { id: 'fb-cards', label: 'SkeletonFallback variant="cards"', hint: 'Grade responsiva 16/9' },
  { id: 'fb-table', label: 'SkeletonFallback variant="table"', hint: 'Header + linhas tabulares' },
  {
    id: 'fb-filters',
    label: 'SkeletonFallback variant="filters"',
    hint: 'Barra horizontal compacta',
  },
  { id: 'fb-inline', label: 'SkeletonFallback variant="inline"', hint: 'Badge mínimo' },
  {
    id: 'err-branded',
    label: 'Error fallback — branded skeleton lança',
    hint: 'SkeletonErrorBoundary captura e mostra fallback genérico',
  },
  {
    id: 'err-chunk',
    label: 'Error fallback — lazy chunk rejeita',
    hint: 'Use o botão "Fail" + recarregue /cameras, /alerts ou /zones',
  },
];

function ThrowingBranded(): JSX.Element {
  throw new Error('debug: branded skeleton crashed (intencional)');
}

const FAILURE_MODES: SkeletonFailureMode[] = ['off', 'cameras', 'alerts', 'zones', 'all'];

export default function LoadingStatesChecklistPage() {
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [variant, setVariant] = useState<SkeletonFallbackVariant>('cards');
  const [failureMode, setFailureMode] = useState<SkeletonFailureMode>(() =>
    getSkeletonFailureMode()
  );
  const [forceBrandedError, setForceBrandedError] = useState(false);

  const progress = useMemo(() => `${checked.size}/${CHECKLIST.length}`, [checked.size]);

  const toggle = (id: string) =>
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const handleFailureModeChange = (mode: SkeletonFailureMode) => {
    setSkeletonFailureMode(mode);
    setFailureMode(mode);
  };

  return (
    <PageContent className="max-w-7xl mx-auto space-y-6">
      <PageMeta
        title="Loading States Checklist — VISÃO"
        description="Checklist visual dos estados de carregamento, error fallback e chunk falhou."
      />

      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            Loading States Checklist
            <Badge variant="secondary" className="font-mono">
              {progress}
            </Badge>
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Página DEV/QA para validação visual rápida dos estados de loading, error fallback e
            falha de chunk lazy. Marque cada item após verificar visualmente abaixo ou na rota
            correspondente.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setChecked(new Set())} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Resetar checklist
        </Button>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Checklist</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {CHECKLIST.map((item) => {
              const done = checked.has(item.id);
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => toggle(item.id)}
                    aria-pressed={done}
                    className={cn(
                      'w-full text-left flex items-start gap-3 p-3 rounded-md border transition-colors',
                      'hover:bg-accent hover:text-accent-foreground',
                      done && 'bg-muted/40 border-primary/40'
                    )}
                  >
                    {done ? (
                      <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{item.label}</div>
                      <div className="text-xs text-muted-foreground">{item.hint}</div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      <Tabs defaultValue="branded">
        <TabsList>
          <TabsTrigger value="branded">Skeletons branded</TabsTrigger>
          <TabsTrigger value="generic">Fallback genérico</TabsTrigger>
          <TabsTrigger value="error">Error fallback</TabsTrigger>
          <TabsTrigger value="chunk">Lazy chunk failure</TabsTrigger>
        </TabsList>

        <TabsContent value="branded" className="space-y-6 mt-4">
          <section>
            <h2 className="text-sm font-semibold mb-2">CamerasSkeleton</h2>
            <div className="border rounded-lg overflow-hidden">
              <CamerasSkeleton />
            </div>
          </section>
          <section>
            <h2 className="text-sm font-semibold mb-2">AlertsSkeleton</h2>
            <div className="border rounded-lg overflow-hidden">
              <AlertsSkeleton />
            </div>
          </section>
          <section>
            <h2 className="text-sm font-semibold mb-2">ZonesSkeleton</h2>
            <div className="border rounded-lg overflow-hidden">
              <ZonesSkeleton />
            </div>
          </section>
        </TabsContent>

        <TabsContent value="generic" className="space-y-4 mt-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-muted-foreground">Variante:</span>
            {(['page', 'cards', 'table', 'filters', 'inline'] as SkeletonFallbackVariant[]).map(
              (v) => (
                <Button
                  key={v}
                  size="sm"
                  variant={variant === v ? 'default' : 'outline'}
                  onClick={() => setVariant(v)}
                >
                  {v}
                </Button>
              )
            )}
          </div>
          <div className="border rounded-lg p-4">
            <SkeletonFallback variant={variant} label={`Carregando (${variant})…`} />
          </div>
        </TabsContent>

        <TabsContent value="error" className="space-y-4 mt-4">
          <p className="text-sm text-muted-foreground">
            O componente abaixo lança intencionalmente no render. O
            <code className="mx-1 px-1 rounded bg-muted">SkeletonErrorBoundary</code>
            captura e exibe <code className="mx-1 px-1 rounded bg-muted">SkeletonFallback</code>.
          </p>
          <div className="flex gap-2">
            <Button
              variant={forceBrandedError ? 'destructive' : 'outline'}
              onClick={() => setForceBrandedError((v) => !v)}
              className="gap-2"
            >
              <AlertTriangle className="h-4 w-4" />
              {forceBrandedError ? 'Desativar erro' : 'Forçar erro no skeleton'}
            </Button>
          </div>
          <div className="border rounded-lg p-4">
            <SkeletonErrorBoundary
              boundaryName="LoadingStatesChecklist:branded-demo"
              fallbackVariant="cards"
              label="Skeleton falhou — exibindo fallback genérico"
            >
              {forceBrandedError ? (
                <ThrowingBranded />
              ) : (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  (Clique no botão acima para forçar o erro)
                </p>
              )}
            </SkeletonErrorBoundary>
          </div>
        </TabsContent>

        <TabsContent value="chunk" className="space-y-4 mt-4">
          <p className="text-sm text-muted-foreground">
            Define o modo de falha global. Após selecionar, navegue para
            <code className="mx-1 px-1 rounded bg-muted">/cameras</code>,
            <code className="mx-1 px-1 rounded bg-muted">/alerts</code> ou
            <code className="mx-1 px-1 rounded bg-muted">/zones</code> e recarregue a página: o lazy
            chunk rejeita e o fallback genérico aparece.
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-muted-foreground">Modo de falha:</span>
            {FAILURE_MODES.map((m) => (
              <Button
                key={m}
                size="sm"
                variant={failureMode === m ? 'destructive' : 'outline'}
                onClick={() => handleFailureModeChange(m)}
              >
                {m}
              </Button>
            ))}
          </div>
          <div className="text-xs text-muted-foreground">
            Estado atual: <code className="px-1 rounded bg-muted">{failureMode}</code> — persistido
            em <code className="px-1 rounded bg-muted">localStorage</code> (`visao:skeleton-fail`).
          </div>
        </TabsContent>
      </Tabs>
    </PageContent>
  );
}
