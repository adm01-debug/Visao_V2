import { useState } from 'react';
import { Bell, Search, User, LogOut, Volume2, VolumeX, BellRing, BellOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { NotificationsPanel } from '@/components/NotificationsPanel';
import { SoundSettingsPanel } from '@/components/SoundSettingsPanel';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useAuth } from '@/contexts/AuthContext';
import { getAlertSoundsMuted, setAlertSoundsMuted } from '@/lib/alertSounds';
import { 
  requestNotificationPermission, 
  getNotificationPermission, 
  getBrowserNotificationsEnabled, 
  setBrowserNotificationsEnabled,
  isNotificationSupported 
} from '@/lib/browserNotifications';
import { toast } from 'sonner';

interface HeaderProps {
  alertCount: number;
}

export function Header({ alertCount }: HeaderProps) {
  const { user, signOut } = useAuth();
  const [isMuted, setIsMuted] = useState(getAlertSoundsMuted);
  const [pushEnabled, setPushEnabled] = useState(() => {
    return isNotificationSupported() && 
           getNotificationPermission() === 'granted' && 
           getBrowserNotificationsEnabled();
  });

  const toggleMute = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    setAlertSoundsMuted(newMuted);
  };

  const togglePushNotifications = async () => {
    if (!isNotificationSupported()) {
      toast.error('Seu navegador não suporta notificações push');
      return;
    }

    if (pushEnabled) {
      // Disable push notifications
      setBrowserNotificationsEnabled(false);
      setPushEnabled(false);
      toast.info('Notificações push desativadas');
    } else {
      // Check/request permission first
      const permission = getNotificationPermission();
      
      if (permission === 'denied') {
        toast.error('Notificações bloqueadas. Altere nas configurações do navegador.');
        return;
      }
      
      if (permission === 'default') {
        const newPermission = await requestNotificationPermission();
        if (newPermission !== 'granted') {
          toast.error('Permissão para notificações negada');
          return;
        }
      }
      
      setBrowserNotificationsEnabled(true);
      setPushEnabled(true);
      toast.success('Notificações push ativadas');
    }
  };

  return (
    <header className="h-16 border-b border-border bg-card/50 backdrop-blur-sm flex items-center justify-between px-6">
      {/* Search */}
      <div className="flex items-center gap-3 flex-1 max-w-md">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar câmeras, alertas..."
            className="w-full h-10 pl-10 pr-4 rounded-lg bg-secondary border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* Sound Toggle */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button 
                onClick={toggleMute}
                className="relative p-2 rounded-lg hover:bg-secondary transition-colors"
              >
                {isMuted ? (
                  <VolumeX className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <Volume2 className="w-5 h-5 text-primary" />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{isMuted ? 'Ativar sons de alerta' : 'Silenciar alertas'}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Push Notifications Toggle */}
        {isNotificationSupported() && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button 
                  onClick={togglePushNotifications}
                  className="relative p-2 rounded-lg hover:bg-secondary transition-colors"
                >
                  {pushEnabled ? (
                    <BellRing className="w-5 h-5 text-primary" />
                  ) : (
                    <BellOff className="w-5 h-5 text-muted-foreground" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{pushEnabled ? 'Desativar notificações push' : 'Ativar notificações push'}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {/* Sound Settings */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <SoundSettingsPanel />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Configurações de som</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <NotificationsPanel
          trigger={
            <button className="relative p-2 rounded-lg hover:bg-secondary transition-colors">
              <Bell className="w-5 h-5 text-muted-foreground" />
              {alertCount > 0 && (
                <Badge variant="destructive" className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center text-xs">
                  {alertCount}
                </Badge>
              )}
            </button>
          }
        />

        {/* Time */}
        <div className="text-sm font-mono text-muted-foreground px-2">
          {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </div>

        {/* User Menu */}
        <div className="flex items-center gap-3 pl-4 border-l border-border">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-3 h-auto p-2">
                <div className="text-right">
                  <p className="text-sm font-medium text-foreground">
                    {user?.user_metadata?.full_name || 'Operador'}
                  </p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <User className="w-5 h-5 text-primary" />
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut} className="text-destructive focus:text-destructive">
                <LogOut className="w-4 h-4 mr-2" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
