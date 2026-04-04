import { ScanFace } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { SettingsSection, SettingRow } from './SettingsSection';
import type { FaceRecognitionSettings } from './types';

interface Props {
  settings: FaceRecognitionSettings;
  onChange: React.Dispatch<React.SetStateAction<FaceRecognitionSettings>>;
}

export function FaceSettingsTab({ settings, onChange }: Props) {
  return (
    <div className="space-y-6 mt-6">
      <SettingsSection title="Reconhecimento Facial" description="Detecção e identificação de rostos" icon={ScanFace}>
        <SettingRow label="Ativar" description="Detecção de rostos">
          <Switch checked={settings.enabled} onCheckedChange={(checked) => onChange(prev => ({ ...prev, enabled: checked }))} />
        </SettingRow>
        <Separator />
        <SettingRow label="Limiar de Match" description={`≥ ${Math.round(settings.matchThreshold * 100)}%`}>
          <div className="w-40 flex items-center gap-2">
            <Slider value={[settings.matchThreshold * 100]}
              onValueChange={([v]) => onChange(prev => ({ ...prev, matchThreshold: (v ?? 60) / 100 }))}
              min={40} max={90} step={5} />
            <span className="text-xs w-10">{Math.round(settings.matchThreshold * 100)}%</span>
          </div>
        </SettingRow>
        <Separator />
        <SettingRow label="Qualidade Mínima" description={`≥ ${Math.round(settings.minFaceQuality * 100)}%`}>
          <div className="w-40 flex items-center gap-2">
            <Slider value={[settings.minFaceQuality * 100]}
              onValueChange={([v]) => onChange(prev => ({ ...prev, minFaceQuality: (v ?? 50) / 100 }))}
              min={20} max={80} step={5} />
            <span className="text-xs w-10">{Math.round(settings.minFaceQuality * 100)}%</span>
          </div>
        </SettingRow>
        <Separator />
        <SettingRow label="Múltiplos Rostos" description="Detectar vários rostos por frame">
          <Switch checked={settings.detectMultipleFaces} onCheckedChange={(checked) => onChange(prev => ({ ...prev, detectMultipleFaces: checked }))} />
        </SettingRow>
        <Separator />
        <SettingRow label="Alertar Desconhecidos" description="Alerta para rostos não cadastrados">
          <Switch checked={settings.alertOnUnknown} onCheckedChange={(checked) => onChange(prev => ({ ...prev, alertOnUnknown: checked }))} />
        </SettingRow>
        <Separator />
        <SettingRow label="Salvar Desconhecidos" description="Armazenar rostos não identificados">
          <Switch checked={settings.saveUnknownFaces} onCheckedChange={(checked) => onChange(prev => ({ ...prev, saveUnknownFaces: checked }))} />
        </SettingRow>
      </SettingsSection>
    </div>
  );
}
