/**
 * VISÃO - Sistema de Vigilância Inteligente
 * PPEDetectionPanel Component - Personal Protective Equipment Detection
 */

import { memo, useState } from 'react';
import { 
  HardHat, 
  Eye, 
  Shield,
  AlertTriangle,
  CheckCircle,
  Settings,
  Save
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

export type PPEType = 'helmet' | 'vest' | 'gloves' | 'goggles' | 'mask' | 'boots' | 'harness';

export interface PPEDetectionConfigData {
  enabled: boolean;
  requiredPPE: PPEType[];
  confidenceThreshold: number;
  alertOnMissing: boolean;
  alertDelay: number;
  zones: string[];
}

interface PPEDetectionPanelProps {
  config: PPEDetectionConfigData;
  onChange: (config: PPEDetectionConfigData) => void;
  onSave?: () => Promise<void>;
  detectionStats?: {
    compliant: number;
    nonCompliant: number;
    lastCheck: Date;
  };
  isLoading?: boolean;
  className?: string;
}

const ppeOptions: { value: PPEType; label: string; icon: string }[] = [
  { value: 'helmet', label: 'Capacete', icon: '🪖' },
  { value: 'vest', label: 'Colete', icon: '🦺' },
  { value: 'gloves', label: 'Luvas', icon: '🧤' },
  { value: 'goggles', label: 'Óculos', icon: '🥽' },
  { value: 'mask', label: 'Máscara', icon: '😷' },
  { value: 'boots', label: 'Botas', icon: '🥾' },
  { value: 'harness', label: 'Cinto', icon: '🪢' },
];

function PPEDetectionPanelComponent({
  config,
  onChange,
  onSave,
  detectionStats,
  isLoading = false,
  className
}: PPEDetectionPanelProps) {
  const updateConfig = (updates: Partial<PPEDetectionConfigData>) => {
    onChange({ ...config, ...updates });
  };

  const togglePPE = (ppe: PPEType) => {
    const newRequired = config.requiredPPE.includes(ppe)
      ? config.requiredPPE.filter(p => p !== ppe)
      : [...config.requiredPPE, ppe];
    updateConfig({ requiredPPE: newRequired });
  };

  const complianceRate = detectionStats 
    ? Math.round((detectionStats.compliant / Math.max(detectionStats.compliant + detectionStats.nonCompliant, 1)) * 100)
    : null;

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <HardHat className="w-5 h-5" />
              Detecção de EPI
            </CardTitle>
            <CardDescription>
              Monitore o uso de Equipamentos de Proteção Individual
            </CardDescription>
          </div>
          <Switch
            checked={config.enabled}
            onCheckedChange={(checked) => updateConfig({ enabled: checked })}
          />
        </div>
      </CardHeader>

      <CardContent className={cn("space-y-6", !config.enabled && "opacity-50 pointer-events-none")}>
        {/* Stats */}
        {detectionStats && (
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-green-500/10 text-center">
              <CheckCircle className="w-6 h-6 text-green-500 mx-auto mb-1" />
              <div className="text-2xl font-bold text-green-500">{detectionStats.compliant}</div>
              <div className="text-xs text-muted-foreground">Conformes</div>
            </div>
            <div className="p-4 rounded-lg bg-destructive/10 text-center">
              <AlertTriangle className="w-6 h-6 text-destructive mx-auto mb-1" />
              <div className="text-2xl font-bold text-destructive">{detectionStats.nonCompliant}</div>
              <div className="text-xs text-muted-foreground">Não Conformes</div>
            </div>
            <div className="p-4 rounded-lg bg-secondary text-center">
              <Shield className="w-6 h-6 text-primary mx-auto mb-1" />
              <div className="text-2xl font-bold">{complianceRate}%</div>
              <div className="text-xs text-muted-foreground">Conformidade</div>
            </div>
          </div>
        )}

        {/* Required PPE */}
        <div className="space-y-3">
          <Label>EPIs Obrigatórios</Label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {ppeOptions.map((option) => {
              const isSelected = config.requiredPPE.includes(option.value);
              return (
                <button
                  key={option.value}
                  onClick={() => togglePPE(option.value)}
                  className={cn(
                    "flex flex-col items-center gap-1 p-3 rounded-lg border transition-colors",
                    isSelected 
                      ? "bg-primary/10 border-primary" 
                      : "border-border hover:bg-accent"
                  )}
                >
                  <span className="text-2xl">{option.icon}</span>
                  <span className="text-xs font-medium">{option.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Confidence Threshold */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Limiar de Confiança</Label>
            <Badge variant="secondary">{config.confidenceThreshold}%</Badge>
          </div>
          <Slider
            value={[config.confidenceThreshold]}
            onValueChange={(v) => updateConfig({ confidenceThreshold: v[0] })}
            min={50}
            max={99}
            step={1}
          />
        </div>

        {/* Alert Settings */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Alertar EPI Ausente</Label>
              <p className="text-sm text-muted-foreground">Gerar alerta quando EPI não for detectado</p>
            </div>
            <Switch
              checked={config.alertOnMissing}
              onCheckedChange={(checked) => updateConfig({ alertOnMissing: checked })}
            />
          </div>

          {config.alertOnMissing && (
            <div className="space-y-3 pl-4 border-l-2 border-primary/30">
              <div className="flex items-center justify-between">
                <Label>Tempo de Tolerância</Label>
                <Badge variant="secondary">{config.alertDelay}s</Badge>
              </div>
              <Slider
                value={[config.alertDelay]}
                onValueChange={(v) => updateConfig({ alertDelay: v[0] })}
                min={0}
                max={30}
                step={1}
              />
              <p className="text-xs text-muted-foreground">
                Aguarda este tempo antes de gerar alerta
              </p>
            </div>
          )}
        </div>

        {/* Save Button */}
        {onSave && (
          <Button onClick={onSave} disabled={isLoading} className="w-full gap-2">
            <Save className="w-4 h-4" />
            {isLoading ? 'Salvando...' : 'Salvar Configurações'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export const PPEDetectionPanel = memo(PPEDetectionPanelComponent);
