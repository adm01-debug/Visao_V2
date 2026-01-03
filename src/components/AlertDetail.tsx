/**
 * VISÃO - Sistema de Vigilância Inteligente
 * AlertDetail Component
 */

import { memo } from 'react';
import { 
  AlertTriangle, 
  Shield, 
  Clock, 
  Camera,
  ShieldAlert,
  Cog,
  BarChart3,
  MapPin,
  User,
  CheckCircle,
  X
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export type AlertType = 'security' | 'safety' | 'operations' | 'access' | 'analytics';
export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface AlertDetailData {
  id: string;
  cameraId: string;
  cameraName: string;
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  timestamp: Date | string;
  isRead: boolean;
  thumbnail?: string;
  location?: string;
  acknowledgedBy?: string;
  acknowledgedAt?: Date | string;
  metadata?: Record<string, unknown>;
}

interface AlertDetailProps {
  alert: AlertDetailData;
  onAcknowledge?: () => void;
  onDismiss?: () => void;
  onNavigateToCamera?: (cameraId: string) => void;
  className?: string;
}

const alertTypeConfig: Record<AlertType, { icon: typeof Shield; label: string; color: string }> = {
  security: { icon: Shield, label: 'Segurança', color: 'text-destructive' },
  safety: { icon: AlertTriangle, label: 'Segurança do Trabalho', color: 'text-warning' },
  operations: { icon: Cog, label: 'Operações', color: 'text-emerald-400' },
  access: { icon: ShieldAlert, label: 'Acesso', color: 'text-destructive' },
  analytics: { icon: BarChart3, label: 'Analytics', color: 'text-purple-400' },
};

const severityConfig: Record<AlertSeverity, { label: string; variant: 'secondary' | 'warning' | 'destructive' | 'default' }> = {
  low: { label: 'Baixa', variant: 'secondary' },
  medium: { label: 'Média', variant: 'warning' },
  high: { label: 'Alta', variant: 'destructive' },
  critical: { label: 'Crítica', variant: 'destructive' },
};

function AlertDetailComponent({ 
  alert, 
  onAcknowledge, 
  onDismiss, 
  onNavigateToCamera,
  className 
}: AlertDetailProps) {
  const config = alertTypeConfig[alert.type] || alertTypeConfig.security;
  const severity = severityConfig[alert.severity] || severityConfig.low;
  const Icon = config.icon;
  const timestamp = alert.timestamp instanceof Date ? alert.timestamp : new Date(alert.timestamp);

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={cn("p-3 rounded-lg bg-secondary", config.color)}>
              <Icon className="w-6 h-6" />
            </div>
            <div>
              <CardTitle className="text-lg">{config.label}</CardTitle>
              <Badge variant={severity.variant} className="mt-1">
                {severity.label}
              </Badge>
            </div>
          </div>
          {onDismiss && (
            <Button variant="ghost" size="icon" onClick={onDismiss}>
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <p className="text-foreground">{alert.message}</p>
        
        {alert.thumbnail && (
          <div className="rounded-lg overflow-hidden border">
            <img 
              src={alert.thumbnail} 
              alt="Captura do alerta" 
              className="w-full h-48 object-cover"
            />
          </div>
        )}
        
        <Separator />
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>{format(timestamp, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
          </div>
          
          <button
            onClick={() => onNavigateToCamera?.(alert.cameraId)}
            className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
          >
            <Camera className="w-4 h-4" />
            <span>{alert.cameraName}</span>
          </button>
          
          {alert.location && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="w-4 h-4" />
              <span>{alert.location}</span>
            </div>
          )}
          
          {alert.acknowledgedBy && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <User className="w-4 h-4" />
              <span>Reconhecido por {alert.acknowledgedBy}</span>
            </div>
          )}
        </div>
        
        {!alert.isRead && onAcknowledge && (
          <Button onClick={onAcknowledge} className="w-full gap-2">
            <CheckCircle className="w-4 h-4" />
            Reconhecer Alerta
          </Button>
        )}
        
        {alert.isRead && (
          <div className="flex items-center gap-2 text-green-500 justify-center">
            <CheckCircle className="w-4 h-4" />
            <span className="text-sm">Alerta reconhecido</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export const AlertDetail = memo(AlertDetailComponent);
