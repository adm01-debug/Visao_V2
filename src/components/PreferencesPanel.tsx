import { useState, useEffect } from 'react';
import { Settings, Sun, Moon, Monitor, Volume2, VolumeX, Bell, BellOff, LayoutGrid, Palette } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeProvider';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';
import { 
  getSoundEnabled, 
  setSoundEnabled, 
  getSoundVolume, 
  setSoundVolume 
} from '@/lib/alertSounds';
import { 
  getBrowserNotificationsEnabled, 
  setBrowserNotificationsEnabled,
  requestNotificationPermission 
} from '@/lib/browserNotifications';
import { toast } from 'sonner';

export type CameraLayoutType = '2x2' | '3x3' | 'list';

export function PreferencesPanel() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [soundEnabled, setSoundEnabledState] = useState(getSoundEnabled());
  const [soundVolume, setSoundVolumeState] = useState(getSoundVolume() * 100);
  const [notificationsEnabled, setNotificationsEnabledState] = useState(getBrowserNotificationsEnabled());
  const [cameraLayout, setCameraLayout] = useState<CameraLayoutType>(() => {
    return (localStorage.getItem('camera-layout') as CameraLayoutType) || '2x2';
  });
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setSoundEnabledState(getSoundEnabled());
    setSoundVolumeState(getSoundVolume() * 100);
    setNotificationsEnabledState(getBrowserNotificationsEnabled());
    setCameraLayout((localStorage.getItem('camera-layout') as CameraLayoutType) || '2x2');
  }, [open]);

  const handleCameraLayoutChange = (layout: CameraLayoutType) => {
    setCameraLayout(layout);
    localStorage.setItem('camera-layout', layout);
    // Dispatch event so Dashboard can react
    window.dispatchEvent(new CustomEvent('camera-layout-change', { detail: layout }));
  };

  const handleSoundToggle = (enabled: boolean) => {
    setSoundEnabledState(enabled);
    setSoundEnabled(enabled);
    toast.success(enabled ? 'Sons ativados' : 'Sons desativados');
  };

  const handleVolumeChange = (value: number[]) => {
    const volume = value[0];
    setSoundVolumeState(volume);
    setSoundVolume(volume / 100);
  };

  const handleNotificationsToggle = async (enabled: boolean) => {
    if (enabled) {
      const granted = await requestNotificationPermission();
      if (granted) {
        setNotificationsEnabledState(true);
        setBrowserNotificationsEnabled(true);
        toast.success('Notificações do navegador ativadas');
      } else {
        toast.error('Permissão de notificação negada');
      }
    } else {
      setNotificationsEnabledState(false);
      setBrowserNotificationsEnabled(false);
      toast.success('Notificações do navegador desativadas');
    }
  };

  const setThemeWithTransition = (newTheme: 'dark' | 'light' | 'system') => {
    document.documentElement.classList.add('theme-transition');
    setTheme(newTheme);
    setTimeout(() => {
      document.documentElement.classList.remove('theme-transition');
    }, 300);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Settings className="w-5 h-5" />
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Preferências
          </SheetTitle>
          <SheetDescription>
            Configure sua experiência no sistema de vigilância
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Aparência */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Palette className="w-4 h-4" />
              Aparência
            </div>
            <Separator />
            
            <div className="space-y-3">
              <Label className="text-sm text-muted-foreground">Tema</Label>
              <RadioGroup
                value={theme}
                onValueChange={setThemeWithTransition}
                className="grid grid-cols-3 gap-2"
              >
                <div>
                  <RadioGroupItem
                    value="light"
                    id="theme-light"
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor="theme-light"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                  >
                    <Sun className="w-5 h-5 mb-2" />
                    <span className="text-xs">Claro</span>
                  </Label>
                </div>
                <div>
                  <RadioGroupItem
                    value="dark"
                    id="theme-dark"
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor="theme-dark"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                  >
                    <Moon className="w-5 h-5 mb-2" />
                    <span className="text-xs">Escuro</span>
                  </Label>
                </div>
                <div>
                  <RadioGroupItem
                    value="system"
                    id="theme-system"
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor="theme-system"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                  >
                    <Monitor className="w-5 h-5 mb-2" />
                    <span className="text-xs">Sistema</span>
                  </Label>
                </div>
              </RadioGroup>
              {theme === 'system' && (
                <p className="text-xs text-muted-foreground">
                  Usando tema {resolvedTheme === 'dark' ? 'escuro' : 'claro'} do sistema
                </p>
              )}
            </div>
          </div>

          {/* Layout das Câmeras */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <LayoutGrid className="w-4 h-4" />
              Layout das Câmeras
            </div>
            <Separator />
            
            <RadioGroup
              value={cameraLayout}
              onValueChange={(value) => handleCameraLayoutChange(value as CameraLayoutType)}
              className="grid grid-cols-3 gap-2"
            >
              <div>
                <RadioGroupItem
                  value="2x2"
                  id="layout-2x2"
                  className="peer sr-only"
                />
                <Label
                  htmlFor="layout-2x2"
                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                >
                  <div className="grid grid-cols-2 gap-0.5 w-6 h-6 mb-2">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="bg-current rounded-sm" />
                    ))}
                  </div>
                  <span className="text-xs">2x2</span>
                </Label>
              </div>
              <div>
                <RadioGroupItem
                  value="3x3"
                  id="layout-3x3"
                  className="peer sr-only"
                />
                <Label
                  htmlFor="layout-3x3"
                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                >
                  <div className="grid grid-cols-3 gap-0.5 w-6 h-6 mb-2">
                    {[...Array(9)].map((_, i) => (
                      <div key={i} className="bg-current rounded-sm" />
                    ))}
                  </div>
                  <span className="text-xs">3x3</span>
                </Label>
              </div>
              <div>
                <RadioGroupItem
                  value="list"
                  id="layout-list"
                  className="peer sr-only"
                />
                <Label
                  htmlFor="layout-list"
                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                >
                  <div className="flex flex-col gap-0.5 w-6 h-6 mb-2">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="bg-current h-1.5 rounded-sm" />
                    ))}
                  </div>
                  <span className="text-xs">Lista</span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Sons */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              Sons
            </div>
            <Separator />
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="sound-alerts">Sons de alertas</Label>
                <p className="text-xs text-muted-foreground">
                  Reproduzir sons ao receber alertas
                </p>
              </div>
              <Switch
                id="sound-alerts"
                checked={soundEnabled}
                onCheckedChange={handleSoundToggle}
              />
            </div>

            {soundEnabled && (
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Volume</Label>
                <div className="flex items-center gap-4">
                  <VolumeX className="w-4 h-4 text-muted-foreground" />
                  <Slider
                    value={[soundVolume]}
                    onValueChange={handleVolumeChange}
                    max={100}
                    step={1}
                    className="flex-1"
                  />
                  <Volume2 className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground w-8">{Math.round(soundVolume)}%</span>
                </div>
              </div>
            )}
          </div>

          {/* Notificações */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              {notificationsEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
              Notificações
            </div>
            <Separator />
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="browser-notifications">Notificações do navegador</Label>
                <p className="text-xs text-muted-foreground">
                  Receber notificações mesmo com a aba minimizada
                </p>
              </div>
              <Switch
                id="browser-notifications"
                checked={notificationsEnabled}
                onCheckedChange={handleNotificationsToggle}
              />
            </div>
          </div>

          {/* Atalhos de teclado */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              Atalhos de Teclado
            </div>
            <Separator />
            
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between py-1">
                <span className="text-muted-foreground">Alternar tema</span>
                <kbd className="px-2 py-1 text-xs bg-muted rounded">Ctrl+Shift+T</kbd>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-muted-foreground">Tema claro</span>
                <kbd className="px-2 py-1 text-xs bg-muted rounded">Ctrl+Shift+L</kbd>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-muted-foreground">Tema escuro</span>
                <kbd className="px-2 py-1 text-xs bg-muted rounded">Ctrl+Shift+D</kbd>
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
