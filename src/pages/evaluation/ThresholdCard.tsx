import { useEffect, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { RISK_TYPE_PRESETS } from '@/hooks/useModelThresholds';

export interface ThresholdCardProps {
  preset: (typeof RISK_TYPE_PRESETS)[number];
  minConfidence: number;
  minQuality: number | null;
  isDefault: boolean;
  onSave: (min_confidence: number, min_quality: number | null) => Promise<unknown>;
  onReset: () => Promise<unknown>;
  stats?: { precision: number; recall: number; total: number };
}

export function ThresholdCard({
  preset,
  minConfidence,
  minQuality,
  isDefault,
  onSave,
  onReset,
  stats,
}: ThresholdCardProps) {
  const [confValue, setConfValue] = useState(minConfidence);
  const supportsSens = preset.supportsSensitivity === true;
  const initialSens = minQuality ?? preset.defaultSensitivity ?? 0.5;
  const [sensValue, setSensValue] = useState(initialSens);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setConfValue(minConfidence);
  }, [minConfidence]);

  useEffect(() => {
    setSensValue(minQuality ?? preset.defaultSensitivity ?? 0.5);
  }, [minQuality, preset.defaultSensitivity]);

  const dirty =
    Math.abs(confValue - minConfidence) > 0.001 ||
    (supportsSens && Math.abs(sensValue - initialSens) > 0.001);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(confValue, supportsSens ? sensValue : null);
    } finally {
      setSaving(false);
    }
  };

  const categoryColor =
    preset.category === 'presence'
      ? 'bg-severity-low/10 text-severity-low border-severity-low/30'
      : preset.category === 'behavior'
        ? 'bg-severity-high/10 text-severity-high border-severity-high/30'
        : preset.category === 'identity'
          ? 'bg-primary/10 text-primary border-primary/30'
          : 'bg-muted text-muted-foreground border-border';

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-base">{preset.label}</CardTitle>
              {preset.category && (
                <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', categoryColor)}>
                  {preset.category === 'presence'
                    ? 'Presença'
                    : preset.category === 'behavior'
                      ? 'Comportamento'
                      : preset.category === 'identity'
                        ? 'Identidade'
                        : 'Objeto'}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{preset.description}</p>
          </div>
          {isDefault ? (
            <Badge variant="outline" className="shrink-0">
              Padrão
            </Badge>
          ) : (
            <Badge className="shrink-0 bg-primary/10 text-primary border-primary/30">
              Customizado
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground uppercase tracking-wide">
              Confiança mínima
            </span>
            <span className="text-lg font-bold font-mono tabular-nums">
              {(confValue * 100).toFixed(0)}%
            </span>
          </div>
          <Slider
            value={[Math.round(confValue * 100)]}
            min={10}
            max={99}
            step={1}
            onValueChange={(v) => setConfValue((v[0] ?? 70) / 100)}
            aria-label={`Confiança mínima para ${preset.label}`}
          />
          <div className="flex justify-between text-[10px] text-muted-foreground mt-1 tabular-nums">
            <span>10% (↑ falsos positivos)</span>
            <span>99% (↑ falsos negativos)</span>
          </div>
        </div>

        {supportsSens && (
          <div className="pt-2 border-t border-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground uppercase tracking-wide">
                {preset.sensitivityLabel ?? 'Sensibilidade'}
              </span>
              <span className="text-lg font-bold font-mono tabular-nums text-severity-high">
                {(sensValue * 100).toFixed(0)}%
              </span>
            </div>
            <Slider
              value={[Math.round(sensValue * 100)]}
              min={10}
              max={99}
              step={1}
              onValueChange={(v) => setSensValue((v[0] ?? 50) / 100)}
              aria-label={`Sensibilidade para ${preset.label}`}
            />
            <div className="flex justify-between text-[10px] text-muted-foreground mt-1 tabular-nums">
              <span>10% (tolerante)</span>
              <span>99% (sensível)</span>
            </div>
          </div>
        )}

        {stats && stats.total > 0 && (
          <div className="text-xs grid grid-cols-3 gap-2 p-2 rounded bg-muted/40">
            <div>
              <p className="text-muted-foreground text-[10px] uppercase">Avaliações</p>
              <p className="font-bold tabular-nums">{stats.total}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-[10px] uppercase">Precisão</p>
              <p
                className={cn(
                  'font-bold tabular-nums',
                  stats.precision >= 0.8
                    ? 'text-success'
                    : stats.precision >= 0.5
                      ? 'text-warning'
                      : 'text-destructive'
                )}
              >
                {(stats.precision * 100).toFixed(0)}%
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-[10px] uppercase">Recall</p>
              <p
                className={cn(
                  'font-bold tabular-nums',
                  stats.recall >= 0.8
                    ? 'text-success'
                    : stats.recall >= 0.5
                      ? 'text-warning'
                      : 'text-destructive'
                )}
              >
                {(stats.recall * 100).toFixed(0)}%
              </p>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2">
          <Button size="sm" onClick={handleSave} disabled={!dirty || saving} className="flex-1">
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onReset()} className="gap-1.5">
            <RotateCcw className="w-3.5 h-3.5" /> Padrão
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
