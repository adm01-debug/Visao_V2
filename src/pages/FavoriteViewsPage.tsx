/**
 * Onda 188 — Visualizações favoritas.
 *
 * Paridade com "planos e favoritos" do SIM Next: salvar um arranjo nomeado de
 * mosaico (quais câmeras, em quais células, em qual layout) e restaurá-lo em um
 * clique. Toda a decisão de restauração vem de `favoriteViewRestore.ts`.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Star, Save, PlusCircle, AlertTriangle } from 'lucide-react';
import { PageContent } from '@/components/layout/MainLayout';
import { PageMeta } from '@/components/PageMeta';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCameras } from '@/hooks/useCameras';
import { useDetachedMonitors } from '@/hooks/useDetachedMonitors';
import { DetachedMonitorsBar } from '@/components/favorite-views/DetachedMonitorsBar';
import { useFavoriteViews } from '@/hooks/useFavoriteViews';
import { FavoriteViewsBar } from '@/components/favorite-views/FavoriteViewsBar';
import { FavoriteArrangementGrid } from '@/components/favorite-views/FavoriteArrangementGrid';
import {
  MAX_FAVORITE_VIEWS,
  MONITOR_LAYOUTS,
  type MonitorLayout,
  type RestoredCell,
  cellsToSavedSlots,
  describeRestore,
  layoutCapacity,
  restoreFavoriteView,
} from '@/lib/views/favoriteViewRestore';
import { MAX_DETACHED_WINDOWS } from '@/lib/views/detachedMonitor';

function emptyCells(layout: MonitorLayout): RestoredCell[] {
  return Array.from({ length: layoutCapacity(layout) }, (_, slotIndex) => ({
    slotIndex,
    cameraId: null,
    vacancy: 'empty' as const,
  }));
}

export default function FavoriteViewsPage() {
  const { cameras, loading: camerasLoading } = useCameras();
  const favorites = useFavoriteViews();
  const monitors = useDetachedMonitors();
  const { views, activeId, setActiveId, touchView } = favorites;

  const [layout, setLayout] = useState<MonitorLayout>('2x2');
  const [cells, setCells] = useState<RestoredCell[]>(() => emptyCells('2x2'));
  const [newName, setNewName] = useState('');
  const [notice, setNotice] = useState<string | null>(null);

  const visibleCameraIds = useMemo(() => new Set(cameras.map((c) => c.id)), [cameras]);
  const cameraOptions = useMemo(
    () => cameras.map((c) => ({ id: c.id, name: c.name })),
    [cameras],
  );
  const cameraNames = useMemo(
    () => Object.fromEntries(cameras.map((c) => [c.id, c.name])),
    [cameras],
  );

  /** Restaura o favorito selecionado sempre que ele (ou a frota) muda. */
  useEffect(() => {
    if (!activeId) return;
    const view = views.find((v) => v.id === activeId);
    if (!view) return;
    const result = restoreFavoriteView({
      layout: view.layout,
      saved: view.slots,
      visibleCameraIds,
    });
    setLayout(view.layout);
    setCells(result.cells);
    setNotice(result.degraded ? describeRestore(result) : null);
  }, [activeId, views, visibleCameraIds]);

  const handleLayoutChange = useCallback((next: MonitorLayout) => {
    setLayout(next);
    setCells((current) => {
      const result = restoreFavoriteView({
        layout: next,
        saved: cellsToSavedSlots(current),
        visibleCameraIds,
      });
      setNotice(result.degraded ? describeRestore(result) : null);
      return result.cells;
    });
  }, [visibleCameraIds]);

  const handleAssign = useCallback((slotIndex: number, cameraId: string | null) => {
    setCells((current) =>
      current.map((cell) => {
        if (cell.slotIndex === slotIndex) {
          return { slotIndex, cameraId, vacancy: cameraId ? null : ('empty' as const) };
        }
        // Câmera é única na grade: assumir uma posição libera a anterior.
        if (cameraId && cell.cameraId === cameraId) {
          return { ...cell, cameraId: null, vacancy: 'empty' as const };
        }
        return cell;
      }),
    );
  }, []);

  const handleSelect = useCallback(
    (id: string) => {
      setActiveId(id);
      void touchView(id);
    },
    [setActiveId, touchView],
  );

  const handleCreate = useCallback(async () => {
    const id = await favorites.createView(newName, layout, cellsToSavedSlots(cells));
    if (id) setNewName('');
  }, [favorites, newName, layout, cells]);

  const handleSave = useCallback(async () => {
    if (!activeId) return;
    await favorites.saveArrangement(activeId, layout, cellsToSavedSlots(cells));
  }, [favorites, activeId, layout, cells]);

  const filled = cells.filter((c) => c.cameraId).length;

  return (
    <PageContent>
      <PageMeta
        title="Visualizações favoritas | VISÃO"
        description="Salve arranjos de mosaico nomeados e restaure a disposição das câmeras em um clique."
      />

      <header className="space-y-1">
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Star className="h-6 w-6 text-primary" aria-hidden="true" />
          Visualizações favoritas
        </h1>
        <p className="text-sm text-muted-foreground">
          Um favorito guarda a posição exata de cada câmera. Câmera indisponível deixa a célula
          vazia — as demais nunca mudam de lugar.
        </p>
      </header>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Acesso rápido</CardTitle>
        </CardHeader>
        <CardContent>
          <FavoriteViewsBar
            views={views}
            activeId={activeId}
            onSelect={handleSelect}
            onDelete={(id) => void favorites.deleteView(id)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Janelas destacadas · {monitors.aliveCount}/{MAX_DETACHED_WINDOWS}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DetachedMonitorsBar
            detached={monitors.detached}
            cameraNames={cameraNames}
            now={Date.now()}
            onClose={monitors.closeDetached}
          />
        </CardContent>
      </Card>

      {notice && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          <AlertTitle>Arranjo restaurado com ressalvas</AlertTitle>
          <AlertDescription>{notice}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader className="pb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">
            Arranjo · {filled}/{layoutCapacity(layout)} posições ocupadas
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={layout} onValueChange={(v) => handleLayoutChange(v as MonitorLayout)}>
              <SelectTrigger className="h-8 w-28 text-xs" aria-label="Layout do mosaico">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONITOR_LAYOUTS.map((l) => (
                  <SelectItem key={l} value={l}>
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" onClick={() => void handleSave()} disabled={!activeId}>
              <Save className="mr-2 h-4 w-4" aria-hidden="true" />
              Salvar no favorito
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {camerasLoading ? (
            <p className="text-sm text-muted-foreground">Carregando câmeras…</p>
          ) : (
            <FavoriteArrangementGrid
              layout={layout}
              cells={cells}
              cameras={cameraOptions}
              onAssign={handleAssign}
              onDetach={monitors.detach}
            />
          )}

          <div className="flex flex-col gap-2 border-t pt-4 sm:flex-row sm:items-center">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nome da nova visualização (ex.: Portaria noturna)"
              maxLength={100}
              aria-label="Nome da nova visualização favorita"
              className="sm:max-w-sm"
            />
            <Button
              variant="secondary"
              onClick={() => void handleCreate()}
              disabled={favorites.atQuota || newName.trim().length === 0}
            >
              <PlusCircle className="mr-2 h-4 w-4" aria-hidden="true" />
              Salvar como nova
            </Button>
            {favorites.atQuota && (
              <span className="text-xs text-muted-foreground">
                Limite de {MAX_FAVORITE_VIEWS} visualizações atingido.
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </PageContent>
  );
}
