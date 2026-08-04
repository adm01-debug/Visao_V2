import { Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import type { DashboardSettings } from './DashboardTypes';

interface SettingsSheetProps {
  settings: DashboardSettings;
  onSettingsChange: (settings: DashboardSettings) => void;
}

const toggleItems = [
  {
    key: 'enableStreaming' as const,
    label: 'Streaming ao Vivo',
    desc: 'Exibir vídeo em tempo real',
  },
  { key: 'enableAnalysis' as const, label: 'Análise Contínua', desc: 'Análise automática por IA' },
  {
    key: 'enableFaceRecognition' as const,
    label: 'Reconhecimento Facial',
    desc: 'Detectar e identificar rostos',
  },
  { key: 'enableZones' as const, label: 'Zonas de Interesse', desc: 'Exibir zonas sobre o vídeo' },
];

export function SettingsSheet({ settings, onSettingsChange }: SettingsSheetProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button aria-label="Configurações" variant="outline" size="icon">
          <Settings2 className="w-4 h-4" />
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Configurações do Dashboard</SheetTitle>
          <SheetDescription>Configure as funcionalidades e visualização</SheetDescription>
        </SheetHeader>
        <div className="space-y-6 mt-6">
          {toggleItems.map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>{label}</Label>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
              <Switch
                checked={settings[key]}
                onCheckedChange={(checked) => onSettingsChange({ ...settings, [key]: checked })}
              />
            </div>
          ))}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Atualização Automática</Label>
                <p className="text-xs text-muted-foreground">Recarregar dados periodicamente</p>
              </div>
              <Switch
                checked={settings.autoRefresh}
                onCheckedChange={(checked) =>
                  onSettingsChange({ ...settings, autoRefresh: checked })
                }
              />
            </div>
            {settings.autoRefresh && (
              <div className="mt-4">
                <Label>Intervalo (segundos)</Label>
                <Select
                  value={String(settings.refreshInterval / 1000)}
                  onValueChange={(v) =>
                    onSettingsChange({ ...settings, refreshInterval: Number(v) * 1000 })
                  }
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10 segundos</SelectItem>
                    <SelectItem value="30">30 segundos</SelectItem>
                    <SelectItem value="60">1 minuto</SelectItem>
                    <SelectItem value="300">5 minutos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
