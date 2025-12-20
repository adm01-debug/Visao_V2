import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AlertTriangle, X, Volume2, VolumeX, Bell, BellOff, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useBlacklistAlerts } from '@/hooks/useBlacklistAlerts';
import { 
  requestNotificationPermission, 
  getNotificationPermission,
  setBrowserNotificationsEnabled,
  getBrowserNotificationsEnabled 
} from '@/lib/browserNotifications';

interface BlacklistAlertBannerProps {
  className?: string;
}

export function BlacklistAlertBanner({ className }: BlacklistAlertBannerProps) {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(getBrowserNotificationsEnabled());
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const { recentAlerts, alertCount, clearAlerts } = useBlacklistAlerts({
    enabled: true,
    soundEnabled,
    notificationsEnabled,
  });

  // Request notification permission on mount
  useEffect(() => {
    if (getNotificationPermission() === 'default') {
      requestNotificationPermission();
    }
  }, []);

  const toggleNotifications = async () => {
    if (!notificationsEnabled) {
      const permission = await requestNotificationPermission();
      if (permission === 'granted') {
        setNotificationsEnabled(true);
        setBrowserNotificationsEnabled(true);
      }
    } else {
      setNotificationsEnabled(false);
      setBrowserNotificationsEnabled(false);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    clearAlerts();
  };

  // Reset dismissed state when new alert comes in
  useEffect(() => {
    if (recentAlerts.length > 0) {
      setDismissed(false);
    }
  }, [recentAlerts.length]);

  if (dismissed || recentAlerts.length === 0) {
    return null;
  }

  const latestAlert = recentAlerts[0];

  return (
    <div className={cn(
      'fixed top-4 right-4 z-50 max-w-md w-full',
      'animate-in slide-in-from-top-2 fade-in duration-300',
      className
    )}>
      <div className="bg-destructive text-destructive-foreground rounded-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-destructive-foreground/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-destructive-foreground/20 rounded-full animate-pulse">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold">ALERTA DE BLACKLIST</h3>
              <p className="text-sm opacity-90">
                {alertCount} detecção{alertCount !== 1 ? 'ões' : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive-foreground hover:bg-destructive-foreground/20"
              onClick={() => setSoundEnabled(!soundEnabled)}
            >
              {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive-foreground hover:bg-destructive-foreground/20"
              onClick={toggleNotifications}
            >
              {notificationsEnabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive-foreground hover:bg-destructive-foreground/20"
              onClick={handleDismiss}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Latest Alert */}
        <div className="p-4">
          <div className="flex items-start gap-3">
            <Avatar className="h-12 w-12 border-2 border-destructive-foreground/30">
              {latestAlert.imageUrl ? (
                <AvatarImage src={latestAlert.imageUrl} />
              ) : null}
              <AvatarFallback className="bg-destructive-foreground/20 text-destructive-foreground">
                {latestAlert.personName.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold truncate">{latestAlert.personName}</span>
                <Badge variant="outline" className="border-destructive-foreground/50 text-destructive-foreground">
                  Blacklist
                </Badge>
              </div>
              <p className="text-sm opacity-90 mt-1">
                Detectado em <span className="font-medium">{latestAlert.cameraName}</span>
              </p>
              <div className="flex items-center gap-4 mt-2 text-sm opacity-75">
                <span>
                  {format(latestAlert.timestamp, "HH:mm:ss", { locale: ptBR })}
                </span>
                <span>
                  Confiança: {(latestAlert.confidence * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Expand/Collapse for more alerts */}
        {recentAlerts.length > 1 && (
          <>
            <button
              className="w-full flex items-center justify-center gap-2 py-2 bg-destructive-foreground/10 hover:bg-destructive-foreground/20 transition-colors text-sm"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? (
                <>
                  <ChevronUp className="h-4 w-4" />
                  Ocultar anteriores
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4" />
                  Ver mais {recentAlerts.length - 1} alerta{recentAlerts.length - 1 !== 1 ? 's' : ''}
                </>
              )}
            </button>

            {expanded && (
              <div className="max-h-48 overflow-y-auto border-t border-destructive-foreground/20">
                {recentAlerts.slice(1).map((alert) => (
                  <div 
                    key={alert.id} 
                    className="flex items-center gap-3 p-3 border-b border-destructive-foreground/10 last:border-0"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-destructive-foreground/20 text-destructive-foreground text-xs">
                        {alert.personName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{alert.personName}</p>
                      <p className="text-xs opacity-75">{alert.cameraName}</p>
                    </div>
                    <span className="text-xs opacity-75">
                      {format(alert.timestamp, "HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Actions */}
        <div className="flex gap-2 p-3 bg-destructive-foreground/10">
          <Button
            variant="secondary"
            size="sm"
            className="flex-1"
            onClick={() => window.location.href = '/recognition-logs'}
          >
            Ver Logs
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="flex-1"
            onClick={() => window.location.href = '/face-recognition'}
          >
            Monitorar
          </Button>
        </div>
      </div>
    </div>
  );
}
