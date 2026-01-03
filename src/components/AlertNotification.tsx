/**
 * VISÃO - Sistema de Vigilância Inteligente
 * AlertNotification Component - Toast-style alert notification
 */

import { memo, useEffect, useState } from 'react';
import { 
  AlertTriangle, 
  Shield, 
  X,
  Eye,
  Volume2,
  VolumeX
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export type AlertType = 'security' | 'safety' | 'operations' | 'access' | 'analytics';
export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface NotificationAlert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  cameraName: string;
  timestamp: Date;
}

interface AlertNotificationProps {
  alert: NotificationAlert;
  onDismiss?: () => void;
  onView?: () => void;
  autoHideDuration?: number;
  soundEnabled?: boolean;
  className?: string;
}

const severityStyles: Record<AlertSeverity, string> = {
  low: 'border-l-4 border-l-secondary bg-secondary/10',
  medium: 'border-l-4 border-l-warning bg-warning/10',
  high: 'border-l-4 border-l-destructive bg-destructive/10',
  critical: 'border-l-4 border-l-destructive bg-destructive/20 animate-pulse',
};

function AlertNotificationComponent({
  alert,
  onDismiss,
  onView,
  autoHideDuration = 10000,
  soundEnabled = true,
  className
}: AlertNotificationProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isMuted, setIsMuted] = useState(!soundEnabled);

  useEffect(() => {
    if (autoHideDuration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        onDismiss?.();
      }, autoHideDuration);
      return () => clearTimeout(timer);
    }
  }, [autoHideDuration, onDismiss]);

  useEffect(() => {
    if (soundEnabled && !isMuted && (alert.severity === 'high' || alert.severity === 'critical')) {
      // Play alert sound
      const audio = new Audio('/sounds/alert.mp3');
      audio.volume = 0.5;
      audio.play().catch(() => {});
    }
  }, [alert.severity, soundEnabled, isMuted]);

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss?.();
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, x: 300, scale: 0.9 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 300, scale: 0.9 }}
          className={cn(
            "fixed bottom-4 right-4 z-50 w-96 p-4 rounded-lg shadow-lg backdrop-blur-sm",
            "bg-card border",
            severityStyles[alert.severity],
            className
          )}
        >
          <div className="flex items-start gap-3">
            <div className={cn(
              "p-2 rounded-full",
              alert.severity === 'critical' ? 'bg-destructive text-destructive-foreground' : 'bg-primary/10 text-primary'
            )}>
              {alert.type === 'security' ? (
                <Shield className="w-5 h-5" />
              ) : (
                <AlertTriangle className="w-5 h-5" />
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant={alert.severity === 'critical' ? 'destructive' : 'secondary'}>
                  {alert.severity.toUpperCase()}
                </Badge>
                <span className="text-xs text-muted-foreground">{alert.cameraName}</span>
              </div>
              <p className="text-sm text-foreground line-clamp-2">{alert.message}</p>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setIsMuted(!isMuted)}
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleDismiss}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {onView && (
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-3 gap-2"
              onClick={onView}
            >
              <Eye className="w-4 h-4" />
              Ver Detalhes
            </Button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export const AlertNotification = memo(AlertNotificationComponent);
