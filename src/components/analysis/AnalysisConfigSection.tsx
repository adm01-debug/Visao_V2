/**
 * VISÃO - Analysis Config Section
 */
import { Settings, Shield, HardHat, BarChart3, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import type { AnalysisType } from '@/hooks/useImageAnalysis';

interface AnalysisConfigSectionProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  analysisTypes: AnalysisType[];
  onToggleType: (type: AnalysisType) => void;
  interval: number;
  onIntervalChange: (value: number[]) => void;
  maxPeopleCount: number | undefined;
  onMaxPeopleCountChange: (v: number | undefined) => void;
  minPPECompliance: number;
  onMinPPEComplianceChange: (v: number) => void;
  minConfidence: number;
  onMinConfidenceChange: (v: number) => void;
}

const ANALYSIS_TYPES = [
  { type: 'security' as const, icon: Shield, label: 'Segurança' },
  { type: 'safety' as const, icon: HardHat, label: 'EPI' },
  { type: 'productivity' as const, icon: BarChart3, label: 'Produtividade' },
];

export function AnalysisConfigSection({
  open, onOpenChange, analysisTypes, onToggleType,
  interval, onIntervalChange, maxPeopleCount, onMaxPeopleCountChange,
  minPPECompliance, onMinPPEComplianceChange, minConfidence, onMinConfidenceChange,
}: AnalysisConfigSectionProps) {
  return (
    <Collapsible open={open} onOpenChange={onOpenChange}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" className="w-full justify-between">
          <span className="flex items-center gap-2"><Settings className="w-4 h-4" />Configurações</span>
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-4 pt-4">
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Tipos de Análise</Label>
          <div className="flex flex-wrap gap-2">
            {ANALYSIS_TYPES.map(({ type, icon: Icon, label }) => (
              <Button key={type} variant={analysisTypes.includes(type) ? 'default' : 'outline'} size="sm" onClick={() => onToggleType(type)}>
                <Icon className="w-4 h-4 mr-1" />{label}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Intervalo entre análises</Label>
            <span className="text-sm font-medium">{interval / 1000}s</span>
          </div>
          <Slider value={[interval]} onValueChange={onIntervalChange} min={3000} max={60000} step={1000} />
          <p className="text-xs text-muted-foreground">Mínimo: 3s | Máximo: 60s</p>
        </div>

        <div className="space-y-3">
          <Label className="text-xs text-muted-foreground">Thresholds para Alertas</Label>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm">Máximo de pessoas</span>
              <Select value={maxPeopleCount?.toString() || 'none'} onValueChange={(v) => onMaxPeopleCountChange(v === 'none' ? undefined : parseInt(v))}>
                <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem limite</SelectItem>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Conformidade EPI mínima</span>
              <span className="text-sm font-medium">{minPPECompliance}%</span>
            </div>
            <Slider value={[minPPECompliance]} onValueChange={([v]) => onMinPPEComplianceChange(v!)} min={50} max={100} step={5} />
            <div className="flex items-center justify-between">
              <span className="text-sm">Confiança mínima</span>
              <span className="text-sm font-medium">{(minConfidence * 100).toFixed(0)}%</span>
            </div>
            <Slider value={[minConfidence * 100]} onValueChange={([v]) => onMinConfidenceChange(v! / 100)} min={50} max={100} step={5} />
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
