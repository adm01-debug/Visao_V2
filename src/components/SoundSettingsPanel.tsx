import { useState, useEffect } from 'react';
import { Settings, Volume2, Play } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  getSoundSettings,
  updateSoundSettings,
  playAlertSound,
  TONE_TYPES,
  type AlertSeverity,
  type ToneType,
} from '@/lib/alertSounds';

const SEVERITY_LABELS: Record<AlertSeverity, { label: string; color: string }> = {
  low: { label: 'Baixa', color: 'text-blue-400' },
  medium: { label: 'Média', color: 'text-yellow-400' },
  high: { label: 'Alta', color: 'text-orange-400' },
  critical: { label: 'Crítica', color: 'text-red-400' },
};

const TONE_LABELS: Record<ToneType, string> = {
  sine: 'Suave',
  square: 'Digital',
  triangle: 'Triangular',
  sawtooth: 'Serrado',
};

export function SoundSettingsPanel() {
  const [settings, setSettings] = useState(getSoundSettings);
  const [open, setOpen] = useState(false);

  const handleVolumeChange = (severity: AlertSeverity, value: number[]) => {
    const newSettings = {
      ...settings,
      [severity]: { ...settings[severity], volume: value[0] },
    };
    setSettings(newSettings);
    updateSoundSettings(newSettings);
  };

  const handleToneChange = (severity: AlertSeverity, tone: ToneType) => {
    const newSettings = {
      ...settings,
      [severity]: { ...settings[severity], tone },
    };
    setSettings(newSettings);
    updateSoundSettings(newSettings);
  };

  const handleFrequencyChange = (severity: AlertSeverity, value: number[]) => {
    const newSettings = {
      ...settings,
      [severity]: { ...settings[severity], frequency: value[0] },
    };
    setSettings(newSettings);
    updateSoundSettings(newSettings);
  };

  const handleBeepsChange = (severity: AlertSeverity, beeps: string) => {
    const newSettings = {
      ...settings,
      [severity]: { ...settings[severity], beeps: parseInt(beeps) },
    };
    setSettings(newSettings);
    updateSoundSettings(newSettings);
  };

  const testSound = async (severity: AlertSeverity) => {
    await playAlertSound(severity, true);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button className="relative p-2 rounded-lg hover:bg-secondary transition-colors">
          <Settings className="w-5 h-5 text-muted-foreground hover:text-primary transition-colors" />
        </button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Volume2 className="w-5 h-5" />
            Configurações de Som
          </SheetTitle>
          <SheetDescription>
            Personalize os sons de alerta para cada nível de severidade.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-8">
          {(Object.keys(SEVERITY_LABELS) as AlertSeverity[]).map((severity) => (
            <div key={severity} className="space-y-4 p-4 rounded-lg bg-secondary/50 border border-border">
              <div className="flex items-center justify-between">
                <h3 className={`font-semibold ${SEVERITY_LABELS[severity].color}`}>
                  {SEVERITY_LABELS[severity].label}
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => testSound(severity)}
                  className="gap-2"
                >
                  <Play className="w-3 h-3" />
                  Testar
                </Button>
              </div>

              <div className="space-y-4">
                {/* Volume */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm text-muted-foreground">Volume</Label>
                    <span className="text-sm font-mono text-muted-foreground">
                      {Math.round(settings[severity].volume * 100)}%
                    </span>
                  </div>
                  <Slider
                    value={[settings[severity].volume]}
                    onValueChange={(v) => handleVolumeChange(severity, v)}
                    min={0}
                    max={1}
                    step={0.05}
                    className="w-full"
                  />
                </div>

                {/* Frequency */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm text-muted-foreground">Frequência</Label>
                    <span className="text-sm font-mono text-muted-foreground">
                      {settings[severity].frequency} Hz
                    </span>
                  </div>
                  <Slider
                    value={[settings[severity].frequency]}
                    onValueChange={(v) => handleFrequencyChange(severity, v)}
                    min={200}
                    max={1200}
                    step={20}
                    className="w-full"
                  />
                </div>

                {/* Tone Type */}
                <div className="flex items-center justify-between gap-4">
                  <Label className="text-sm text-muted-foreground">Tipo de Som</Label>
                  <Select
                    value={settings[severity].tone}
                    onValueChange={(v) => handleToneChange(severity, v as ToneType)}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TONE_TYPES.map((tone) => (
                        <SelectItem key={tone} value={tone}>
                          {TONE_LABELS[tone]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Number of Beeps */}
                <div className="flex items-center justify-between gap-4">
                  <Label className="text-sm text-muted-foreground">Repetições</Label>
                  <Select
                    value={String(settings[severity].beeps)}
                    onValueChange={(v) => handleBeepsChange(severity, v)}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          {n}x
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
