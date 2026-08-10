/**
 * VISÃO - EvaluationPage
 *
 * Tela de avaliação humana de detecções. Refatorada — subcomponentes em ./evaluation/.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  HelpCircle,
  Sliders,
  ListChecks,
  Search,
  Camera as CameraIcon,
  TrendingUp,
  Target,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { PageMeta } from '@/components/PageMeta';
import { PageContent } from '@/components/layout/MainLayout';
import { useAlerts } from '@/hooks/useAlerts';
import { usePlateDetections } from '@/hooks/usePlateDetections';
import { useDetectionReviews, type ReviewVerdict } from '@/hooks/useDetectionReviews';
import { useModelThresholds, RISK_TYPE_PRESETS } from '@/hooks/useModelThresholds';
import { KpiCard, Detail } from './evaluation/KpiCard';
import { ThresholdCard } from './evaluation/ThresholdCard';
import { VERDICT_META, VERDICT_BG, type UnifiedDetection } from './evaluation/types';

export default function EvaluationPage() {
  const { alerts, loading: loadingAlerts } = useAlerts();
  const { detections: plateDetections, loading: loadingPlates } = usePlateDetections();
  const {
    reviews,
    upsertReview,
    getReviewFor,
    statsByRisk,
    loading: loadingReviews,
  } = useDetectionReviews();
  const {
    thresholds,
    upsertThreshold,
    getThresholdFor,
    resetToDefault,
    loading: loadingThresholds,
  } = useModelThresholds();

  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState<string>('all');
  const [verdictFilter, setVerdictFilter] = useState<string>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const detections = useMemo<UnifiedDetection[]>(() => {
    const out: UnifiedDetection[] = [];
    for (const a of alerts) {
      out.push({
        source_table: 'alerts',
        source_id: a.id,
        timestamp: a.timestamp,
        camera_id: a.camera_id,
        camera_name: a.camera_name,
        risk_type:
          a.type === 'security' || a.type === 'safety' || a.type === 'access'
            ? 'security'
            : a.type === 'analytics'
              ? 'behavior'
              : 'security',
        model_name: 'gemini-vision',
        title: a.message,
        subtitle: `Alerta · ${a.type}`,
        confidence: null,
        thumbnail: a.thumbnail,
        severity: a.severity,
      });
    }
    for (const p of plateDetections) {
      out.push({
        source_table: 'plate_detections',
        source_id: p.id,
        timestamp:
          typeof p.timestamp === 'string' ? p.timestamp : new Date(p.timestamp).toISOString(),
        camera_id: p.camera_id,
        camera_name: p.camera_name,
        risk_type: 'license_plate',
        model_name: 'alpr',
        title: `Placa ${p.plate}`,
        subtitle: `ALPR · ${p.vehicle_type ?? 'veículo'} · ${p.status}`,
        confidence: typeof p.confidence === 'number' ? p.confidence : null,
        thumbnail: p.image_url,
      });
    }
    return out.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [alerts, plateDetections]);

  const filtered = useMemo(() => {
    return detections.filter((d) => {
      if (riskFilter !== 'all' && d.risk_type !== riskFilter) return false;
      if (verdictFilter !== 'all') {
        const r = getReviewFor(d.source_table, d.source_id);
        if (verdictFilter === 'pending' && r) return false;
        if (verdictFilter !== 'pending' && r?.verdict !== verdictFilter) return false;
      }
      if (search) {
        const q = search.toLowerCase();
        const hay = [d.title, d.subtitle, d.camera_name].join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [detections, riskFilter, verdictFilter, search, getReviewFor]);

  useEffect(() => {
    if (filtered.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !filtered.some((d) => `${d.source_table}:${d.source_id}` === selectedId)) {
      const first = filtered[0];
      if (first) setSelectedId(`${first.source_table}:${first.source_id}`);
    }
  }, [filtered, selectedId]);

  const selected = useMemo(
    () => filtered.find((d) => `${d.source_table}:${d.source_id}` === selectedId) ?? null,
    [filtered, selectedId]
  );

  const selectedReview = selected
    ? getReviewFor(selected.source_table, selected.source_id)
    : undefined;

  const handleVerdict = async (verdict: ReviewVerdict) => {
    if (!selected) return;
    await upsertReview({
      source_table: selected.source_table,
      source_id: selected.source_id,
      camera_id: selected.camera_id,
      camera_name: selected.camera_name,
      risk_type: selected.risk_type,
      model_name: selected.model_name,
      verdict,
      original_confidence: selected.confidence,
    });
  };

  const overallStats = useMemo(() => {
    const total = detections.length;
    const reviewed = reviews.length;
    const pending = Math.max(0, total - reviewed);
    let tp = 0,
      fp = 0,
      fn = 0;
    for (const r of reviews) {
      if (r.verdict === 'true_positive') tp++;
      else if (r.verdict === 'false_positive') fp++;
      else if (r.verdict === 'false_negative') fn++;
    }
    return {
      total,
      reviewed,
      pending,
      precision: tp + fp > 0 ? tp / (tp + fp) : 0,
      recall: tp + fn > 0 ? tp / (tp + fn) : 0,
    };
  }, [detections.length, reviews]);

  const loading = loadingAlerts || loadingPlates || loadingReviews;

  return (
    <PageContent className="space-y-6">
      <PageMeta
        title="Avaliação de Detecções | VISÃO"
        description="Revise detecções, marque acertos e erros, e ajuste thresholds dos modelos por tipo de risco."
      />

      <header>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Target className="w-7 h-7 text-primary" />
          Avaliação de Detecções
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Marque acertos e erros para medir a qualidade dos modelos e ajustar thresholds por tipo de
          risco.
        </p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KpiCard
          label="Detecções"
          value={overallStats.total}
          icon={<ListChecks className="w-4 h-4" />}
        />
        <KpiCard
          label="Avaliadas"
          value={overallStats.reviewed}
          tone="ok"
          icon={<CheckCircle2 className="w-4 h-4" />}
        />
        <KpiCard
          label="Pendentes"
          value={overallStats.pending}
          tone={overallStats.pending > 0 ? 'warn' : undefined}
          icon={<HelpCircle className="w-4 h-4" />}
        />
        <KpiCard
          label="Precisão"
          value={`${(overallStats.precision * 100).toFixed(0)}%`}
          tone={
            overallStats.precision >= 0.8 ? 'ok' : overallStats.precision >= 0.5 ? 'warn' : 'danger'
          }
          icon={<TrendingUp className="w-4 h-4" />}
        />
        <KpiCard
          label="Recall"
          value={`${(overallStats.recall * 100).toFixed(0)}%`}
          tone={overallStats.recall >= 0.8 ? 'ok' : overallStats.recall >= 0.5 ? 'warn' : 'danger'}
          icon={<Target className="w-4 h-4" />}
        />
      </div>

      <Tabs defaultValue="review" className="space-y-4">
        <TabsList>
          <TabsTrigger value="review" className="gap-2">
            <ListChecks className="w-4 h-4" /> Revisar Detecções
          </TabsTrigger>
          <TabsTrigger value="thresholds" className="gap-2">
            <Sliders className="w-4 h-4" /> Thresholds por Risco
          </TabsTrigger>
        </TabsList>

        <TabsContent value="review" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por título, câmera..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={riskFilter} onValueChange={setRiskFilter}>
              <SelectTrigger className="w-52">
                <SelectValue placeholder="Tipo de risco" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os riscos</SelectItem>
                {RISK_TYPE_PRESETS.map((r) => (
                  <SelectItem key={r.key} value={r.key}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={verdictFilter} onValueChange={setVerdictFilter}>
              <SelectTrigger className="w-52">
                <SelectValue placeholder="Status da avaliação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="pending">Pendentes</SelectItem>
                <SelectItem value="true_positive">Verdadeiros Positivos</SelectItem>
                <SelectItem value="false_positive">Falsos Positivos</SelectItem>
                <SelectItem value="false_negative">Falsos Negativos</SelectItem>
                <SelectItem value="uncertain">Incertos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="grid lg:grid-cols-[420px_1fr] gap-4">
              <Skeleton className="h-[600px]" />
              <Skeleton className="h-[600px]" />
            </div>
          ) : filtered.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center text-muted-foreground">
                Nenhuma detecção corresponde aos filtros atuais.
              </CardContent>
            </Card>
          ) : (
            <div className="grid lg:grid-cols-[420px_1fr] gap-4 items-start">
              <Card className="overflow-hidden">
                <CardHeader className="py-3 px-4 bg-muted/30 border-b border-border">
                  <CardTitle className="text-sm font-semibold">
                    {filtered.length} detecções
                  </CardTitle>
                </CardHeader>
                <ScrollArea className="h-[600px]">
                  <div className="divide-y divide-border">
                    {filtered.map((d) => {
                      const key = `${d.source_table}:${d.source_id}`;
                      const isSelected = key === selectedId;
                      const review = getReviewFor(d.source_table, d.source_id);
                      const VIcon = review ? VERDICT_META[review.verdict].icon : HelpCircle;
                      const verdictTone = review
                        ? VERDICT_META[review.verdict].tone
                        : 'text-muted-foreground/50';
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setSelectedId(key)}
                          className={cn(
                            'w-full text-left p-3 transition-colors',
                            'hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary',
                            isSelected && 'bg-primary/10'
                          )}
                          aria-pressed={isSelected}
                        >
                          <div className="flex items-start gap-3">
                            <VIcon className={cn('w-5 h-5 shrink-0 mt-0.5', verdictTone)} />
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-sm leading-tight line-clamp-2">
                                {d.title}
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                                {d.subtitle}
                              </p>
                              <div className="flex items-center gap-2 mt-1.5 text-[11px] text-muted-foreground">
                                <CameraIcon className="w-3 h-3" />
                                <span className="truncate">{d.camera_name}</span>
                                <span>·</span>
                                <span className="tabular-nums">
                                  {format(new Date(d.timestamp), 'dd/MM HH:mm', { locale: ptBR })}
                                </span>
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </ScrollArea>
              </Card>

              <div className="space-y-4">
                {selected ? (
                  <>
                    <Card
                      className={cn(
                        'overflow-hidden ring-2 ring-inset',
                        selectedReview ? VERDICT_BG[selectedReview.verdict] : 'ring-border'
                      )}
                    >
                      {/* eslint-disable-next-line visao/no-hardcoded-colors -- player de vídeo precisa de fundo preto */}
                      <div className="aspect-video bg-black flex items-center justify-center">
                        {selected.thumbnail ? (
                          <img
                            src={selected.thumbnail}
                            alt={selected.title}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <div className="text-muted-foreground/50 text-sm flex flex-col items-center gap-2">
                            <CameraIcon className="w-10 h-10" />
                            <span>Sem snapshot</span>
                          </div>
                        )}
                      </div>
                      <CardContent className="p-4 space-y-3">
                        <div>
                          <h3 className="font-semibold text-base">{selected.title}</h3>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {selected.subtitle} ·{' '}
                            {format(new Date(selected.timestamp), "dd 'de' MMMM 'às' HH:mm:ss", {
                              locale: ptBR,
                            })}
                          </p>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                          <Detail label="Câmera" value={selected.camera_name} />
                          <Detail label="Modelo" value={selected.model_name} />
                          <Detail
                            label="Tipo de risco"
                            value={
                              RISK_TYPE_PRESETS.find((r) => r.key === selected.risk_type)?.label ??
                              selected.risk_type
                            }
                          />
                          <Detail
                            label="Confiança"
                            value={
                              typeof selected.confidence === 'number'
                                ? `${(selected.confidence * 100).toFixed(1)}%`
                                : '—'
                            }
                          />
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                          <ListChecks className="w-4 h-4" /> Marcar avaliação
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {(Object.keys(VERDICT_META) as ReviewVerdict[]).map((v) => {
                            const meta = VERDICT_META[v];
                            const Icon = meta.icon;
                            const active = selectedReview?.verdict === v;
                            return (
                              <Button
                                key={v}
                                type="button"
                                variant={active ? 'default' : 'outline'}
                                onClick={() => handleVerdict(v)}
                                className={cn('h-auto py-3 flex-col gap-1.5', !active && meta.tone)}
                              >
                                <Icon className="w-5 h-5" />
                                <span className="text-xs font-medium leading-tight text-center">
                                  {meta.label}
                                </span>
                              </Button>
                            );
                          })}
                        </div>
                        {selectedReview && (
                          <p className="text-xs text-muted-foreground">
                            Última avaliação:{' '}
                            <strong className={VERDICT_META[selectedReview.verdict].tone}>
                              {VERDICT_META[selectedReview.verdict].label}
                            </strong>{' '}
                            em{' '}
                            {format(new Date(selectedReview.reviewed_at), "dd/MM 'às' HH:mm", {
                              locale: ptBR,
                            })}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </>
                ) : (
                  <Card>
                    <CardContent className="p-12 text-center text-muted-foreground">
                      Selecione uma detecção à esquerda para começar a avaliar.
                    </CardContent>
                  </Card>
                )}

                {statsByRisk.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" /> Qualidade por tipo de risco
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {statsByRisk.map((s) => {
                        const preset = RISK_TYPE_PRESETS.find((r) => r.key === s.risk_type);
                        return (
                          <div
                            key={s.risk_type}
                            className="flex items-center justify-between gap-3 text-sm"
                          >
                            <div className="min-w-0">
                              <p className="font-medium truncate">{preset?.label ?? s.risk_type}</p>
                              <p className="text-xs text-muted-foreground tabular-nums">
                                TP {s.true_positive} · FP {s.false_positive} · FN {s.false_negative}{' '}
                                · ?{s.uncertain}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-xs text-muted-foreground">Precisão / Recall</p>
                              <p className="font-mono tabular-nums text-xs">
                                <span
                                  className={
                                    s.precision >= 0.8
                                      ? 'text-success'
                                      : s.precision >= 0.5
                                        ? 'text-warning'
                                        : 'text-destructive'
                                  }
                                >
                                  {(s.precision * 100).toFixed(0)}%
                                </span>
                                {' / '}
                                <span
                                  className={
                                    s.recall >= 0.8
                                      ? 'text-success'
                                      : s.recall >= 0.5
                                        ? 'text-warning'
                                        : 'text-destructive'
                                  }
                                >
                                  {(s.recall * 100).toFixed(0)}%
                                </span>
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="thresholds" className="space-y-4">
          {loadingThresholds ? (
            <Skeleton className="h-96" />
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {RISK_TYPE_PRESETS.map((preset) => {
                const current = getThresholdFor(preset.key);
                const stats = statsByRisk.find((s) => s.risk_type === preset.key);
                return (
                  <ThresholdCard
                    key={preset.key}
                    preset={preset}
                    minConfidence={current.min_confidence}
                    minQuality={current.min_quality}
                    isDefault={current.isDefault}
                    onSave={(min_confidence, min_quality) =>
                      upsertThreshold({
                        risk_type: preset.key,
                        model_name: preset.defaultModel,
                        min_confidence,
                        min_quality,
                      })
                    }
                    onReset={() => resetToDefault(preset.key)}
                    stats={stats}
                  />
                );
              })}
            </div>
          )}

          {thresholds.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {thresholds.length} threshold(s) personalizado(s). Os pipelines de detecção consultam
              esses valores para filtrar resultados de baixa confiança automaticamente.
            </p>
          )}
        </TabsContent>
      </Tabs>
    </PageContent>
  );
}
