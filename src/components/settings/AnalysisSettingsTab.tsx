import { Brain } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SettingsSection, SettingRow } from './SettingsSection';
import type { AnalysisSettings } from './types';

interface Props {
  settings: AnalysisSettings;
  onChange: React.Dispatch<React.SetStateAction<AnalysisSettings>>;
}

export function AnalysisSettingsTab({ settings, onChange }: Props) {
  return (
    <div className="space-y-6 mt-6">
      <SettingsSection title="Análise por IA" description="Análise automática de vídeo" icon={Brain}>
        <SettingRow label="Análise Contínua" description="Ativar análise automática">
          <Switch checked={settings.analysisEnabled} onCheckedChange={(checked) => onChange(prev => ({ ...prev, analysisEnabled: checked }))} />
        </SettingRow>
        <Separator />
        <SettingRow label="Intervalo" description={`A cada ${settings.defaultInterval / 1000}s`}>
          <Select value={String(settings.defaultInterval)} onValueChange={(v) => onChange(prev => ({ ...prev, defaultInterval: Number(v) }))}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="3000">3s</SelectItem>
              <SelectItem value="5000">5s</SelectItem>
              <SelectItem value="10000">10s</SelectItem>
              <SelectItem value="30000">30s</SelectItem>
            </SelectContent>
          </Select>
        </SettingRow>
        <Separator />
        <SettingRow label="Confiança Mínima" description={`≥ ${Math.round(settings.minConfidence * 100)}%`}>
          <div className="w-40 flex items-center gap-2">
            <Slider value={[settings.minConfidence * 100]}
              onValueChange={([v]) => onChange(prev => ({ ...prev, minConfidence: (v ?? 70) / 100 }))}
              min={30} max={95} step={5} />
            <span className="text-xs w-10">{Math.round(settings.minConfidence * 100)}%</span>
          </div>
        </SettingRow>
        <Separator />
        <SettingRow label="Salvar Histórico">
          <Switch checked={settings.saveHistory} onCheckedChange={(checked) => onChange(prev => ({ ...prev, saveHistory: checked }))} />
        </SettingRow>
        <Separator />
        <SettingRow label="Criar Alertas" description="Gerar alertas automaticamente">
          <Switch checked={settings.createAlerts} onCheckedChange={(checked) => onChange(prev => ({ ...prev, createAlerts: checked }))} />
        </SettingRow>
      </SettingsSection>
    </div>
  );
}
