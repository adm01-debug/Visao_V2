import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '@/contexts/ThemeProvider';
import { THEME_VARIANTS } from '@/types/themes';
import { Settings, Sun, Moon, Monitor, Palette, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { SettingsSection, SettingRow } from './SettingsSection';
import type { GeneralSettings } from './types';

interface Props {
  settings: GeneralSettings;
  onChange: React.Dispatch<React.SetStateAction<GeneralSettings>>;
}

export function GeneralSettingsTab({ settings, onChange }: Props) {
  const { mode, variant, setMode, setVariant } = useTheme();

  return (
    <div className="space-y-6 mt-6">
      <SettingsSection
        title="Preferências Gerais"
        description="Configurações básicas do sistema"
        icon={Settings}
      >
        <SettingRow label="Nome do Sistema" description="Nome exibido no cabeçalho">
          <Input
            aria-label="Nome do Sistema"
            value={settings.systemName}
            onChange={(e) => onChange((prev) => ({ ...prev, systemName: e.target.value }))}
            className="w-48"
          />
        </SettingRow>
        <Separator />
        <SettingRow label="Modo de Aparência" description="Tema claro, escuro ou automático">
          <Select value={mode} onValueChange={(v) => setMode(v as 'light' | 'dark' | 'system')}>
            <SelectTrigger className="w-36" aria-label="Modo de Aparência">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="light">
                <span className="flex items-center gap-2">
                  <Sun className="w-4 h-4" /> Claro
                </span>
              </SelectItem>
              <SelectItem value="dark">
                <span className="flex items-center gap-2">
                  <Moon className="w-4 h-4" /> Escuro
                </span>
              </SelectItem>
              <SelectItem value="system">
                <span className="flex items-center gap-2">
                  <Monitor className="w-4 h-4" /> Sistema
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
        </SettingRow>
        <Separator />

        {/* Theme Variants */}
        <div className="space-y-3 py-2">
          <div className="flex items-center gap-2">
            <Palette className="w-4 h-4 text-muted-foreground" />
            <label className="text-sm font-medium">Variante do Tema</label>
          </div>
          <p className="text-xs text-muted-foreground">
            Escolha a paleta de cores ideal para seu ambiente de trabalho
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
            {THEME_VARIANTS.map((tv, index) => (
              <motion.button
                key={tv.id}
                onClick={() => setVariant(tv.id)}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05, duration: 0.3 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  'relative flex items-start gap-3 p-3 rounded-lg border-2 text-left transition-colors',
                  variant === tv.id
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50'
                )}
              >
                <motion.div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-lg shrink-0"
                  style={{ backgroundColor: tv.previewColors.background }}
                  animate={variant === tv.id ? { scale: [1, 1.1, 1] } : {}}
                >
                  <motion.div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: tv.previewColors.primary }}
                    animate={variant === tv.id ? { scale: [1, 1.3, 1] } : {}}
                    transition={{ duration: 0.4, delay: 0.1 }}
                  />
                </motion.div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{tv.icon}</span>
                    <span className="font-medium text-sm">{tv.name}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                    {tv.description}
                  </p>
                </div>
                <AnimatePresence>
                  {variant === tv.id && (
                    <motion.div
                      className="absolute top-2 right-2"
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      exit={{ scale: 0, rotate: 180 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                    >
                      <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                        <Check className="h-3 w-3 text-primary-foreground" />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
            ))}
          </div>
        </div>

        <Separator />
        <SettingRow label="Sons de Alerta" description="Reproduzir som ao receber alertas">
          <Switch
            aria-label="Sons de Alerta"
            checked={settings.soundEnabled}
            onCheckedChange={(checked) => onChange((prev) => ({ ...prev, soundEnabled: checked }))}
          />
        </SettingRow>
        <Separator />
        <SettingRow label="Atualização Automática" description="Recarregar dados periodicamente">
          <Switch
            aria-label="Atualização Automática"
            checked={settings.autoRefresh}
            onCheckedChange={(checked) => onChange((prev) => ({ ...prev, autoRefresh: checked }))}
          />
        </SettingRow>
        {settings.autoRefresh && (
          <SettingRow label="Intervalo" description={`A cada ${settings.refreshInterval / 1000}s`}>
            <Select
              value={String(settings.refreshInterval)}
              onValueChange={(v) => onChange((prev) => ({ ...prev, refreshInterval: Number(v) }))}
            >
              <SelectTrigger className="w-32" aria-label="Intervalo de atualização automática">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10000">10s</SelectItem>
                <SelectItem value="30000">30s</SelectItem>
                <SelectItem value="60000">1min</SelectItem>
                <SelectItem value="300000">5min</SelectItem>
              </SelectContent>
            </Select>
          </SettingRow>
        )}
      </SettingsSection>
    </div>
  );
}
