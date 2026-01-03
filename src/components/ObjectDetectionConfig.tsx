/**
 * VISÃO - Sistema de Vigilância Inteligente
 * ObjectDetectionConfig Component
 */

import { memo, useState } from 'react';
import { 
  Eye, 
  Settings, 
  Plus, 
  Trash2, 
  Save,
  Package,
  User,
  Car,
  AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

export type DetectableObject = 
  | 'person' 
  | 'vehicle' 
  | 'animal' 
  | 'bag' 
  | 'weapon' 
  | 'fire' 
  | 'smoke';

export interface ObjectDetectionConfigData {
  enabled: boolean;
  confidenceThreshold: number;
  detectableObjects: DetectableObject[];
  alertOnDetection: boolean;
  minObjectSize: number;
  maxObjectsPerFrame: number;
  processingInterval: number;
}

interface ObjectDetectionConfigProps {
  config: ObjectDetectionConfigData;
  onChange: (config: ObjectDetectionConfigData) => void;
  onSave?: () => Promise<void>;
  isLoading?: boolean;
  className?: string;
}

const objectOptions: { value: DetectableObject; label: string; icon: typeof User }[] = [
  { value: 'person', label: 'Pessoas', icon: User },
  { value: 'vehicle', label: 'Veículos', icon: Car },
  { value: 'animal', label: 'Animais', icon: Package },
  { value: 'bag', label: 'Bolsas/Malas', icon: Package },
  { value: 'weapon', label: 'Armas', icon: AlertTriangle },
  { value: 'fire', label: 'Fogo', icon: AlertTriangle },
  { value: 'smoke', label: 'Fumaça', icon: AlertTriangle },
];

function ObjectDetectionConfigComponent({
  config,
  onChange,
  onSave,
  isLoading = false,
  className
}: ObjectDetectionConfigProps) {
  const updateConfig = (updates: Partial<ObjectDetectionConfigData>) => {
    onChange({ ...config, ...updates });
  };

  const toggleObject = (obj: DetectableObject) => {
    const newObjects = config.detectableObjects.includes(obj)
      ? config.detectableObjects.filter(o => o !== obj)
      : [...config.detectableObjects, obj];
    updateConfig({ detectableObjects: newObjects });
  };

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Detecção de Objetos
            </CardTitle>
            <CardDescription>
              Configure os parâmetros de detecção de objetos com IA
            </CardDescription>
          </div>
          <Switch
            checked={config.enabled}
            onCheckedChange={(checked) => updateConfig({ enabled: checked })}
          />
        </div>
      </CardHeader>

      <CardContent className={cn("space-y-6", !config.enabled && "opacity-50 pointer-events-none")}>
        {/* Confidence Threshold */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Limiar de Confiança</Label>
            <Badge variant="secondary">{config.confidenceThreshold}%</Badge>
          </div>
          <Slider
            value={[config.confidenceThreshold]}
            onValueChange={(v) => updateConfig({ confidenceThreshold: v[0] })}
            min={30}
            max={99}
            step={1}
          />
          <p className="text-xs text-muted-foreground">
            Objetos com confiança abaixo deste valor serão ignorados
          </p>
        </div>

        {/* Detectable Objects */}
        <div className="space-y-3">
          <Label>Objetos Detectáveis</Label>
          <div className="grid grid-cols-2 gap-3">
            {objectOptions.map((option) => {
              const Icon = option.icon;
              const isSelected = config.detectableObjects.includes(option.value);
              return (
                <button
                  key={option.value}
                  onClick={() => toggleObject(option.value)}
                  className={cn(
                    "flex items-center gap-2 p-3 rounded-lg border transition-colors text-left",
                    isSelected 
                      ? "bg-primary/10 border-primary text-primary" 
                      : "border-border hover:bg-accent"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{option.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Alert on Detection */}
        <div className="flex items-center justify-between">
          <div>
            <Label>Alertar ao Detectar</Label>
            <p className="text-sm text-muted-foreground">Gerar alerta quando objeto for detectado</p>
          </div>
          <Switch
            checked={config.alertOnDetection}
            onCheckedChange={(checked) => updateConfig({ alertOnDetection: checked })}
          />
        </div>

        {/* Min Object Size */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Tamanho Mínimo do Objeto</Label>
            <Badge variant="secondary">{config.minObjectSize}px</Badge>
          </div>
          <Slider
            value={[config.minObjectSize]}
            onValueChange={(v) => updateConfig({ minObjectSize: v[0] })}
            min={10}
            max={200}
            step={10}
          />
        </div>

        {/* Max Objects per Frame */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Máximo de Objetos por Frame</Label>
            <Badge variant="secondary">{config.maxObjectsPerFrame}</Badge>
          </div>
          <Slider
            value={[config.maxObjectsPerFrame]}
            onValueChange={(v) => updateConfig({ maxObjectsPerFrame: v[0] })}
            min={1}
            max={50}
            step={1}
          />
        </div>

        {/* Processing Interval */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Intervalo de Processamento</Label>
            <Badge variant="secondary">{config.processingInterval}ms</Badge>
          </div>
          <Slider
            value={[config.processingInterval]}
            onValueChange={(v) => updateConfig({ processingInterval: v[0] })}
            min={100}
            max={2000}
            step={100}
          />
          <p className="text-xs text-muted-foreground">
            Tempo entre cada análise de frame
          </p>
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

export const ObjectDetectionConfig = memo(ObjectDetectionConfigComponent);
