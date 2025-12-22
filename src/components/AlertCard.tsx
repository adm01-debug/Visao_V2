import { formatDate, formatNumber } from "@/lib/formatters";
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, 
  Shield, 
  Clock, 
  Camera,
  ShieldAlert,
  Cog,
  BarChart3
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { HighlightText } from './HighlightText';

export type AlertType = 'security' | 'safety' | 'operations' | 'access' | 'analytics';
export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface UIAlert {
  id: string;
  cameraId: string;
  cameraName: string;
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  timestamp: Date;
  isRead: boolean;
  thumbnail?: string;
}

interface AlertCardProps {
  alert: UIAlert;
  onClick?: () => void;
  searchQuery?: string;
  onCameraClick?: (cameraId: string) => void;
}

const alertTypeConfig: Record<AlertType, { icon: typeof Shield; label: string; color: string }> = {
  security: {
    icon: Shield,
    label: 'Segurança',
    color: 'text-destructive',
  },
  safety: {
    icon: AlertTriangle,
    label: 'Segurança do Trabalho',
    color: 'text-warning',
  },
  operations: {
    icon: Cog,
    label: 'Operações',
    color: 'text-emerald-400',
  },
  access: {
    icon: ShieldAlert,
    label: 'Acesso',
    color: 'text-destructive',
  },
  analytics: {
    icon: BarChart3,
    label: 'Analytics',
    color: 'text-purple-400',
  },
};

const severityConfig = {
  low: 'secondary',
  medium: 'warning',
  high: 'destructive',
  critical: 'alert',
} as const;

export function AlertCard({ alert, onClick, searchQuery = '', onCameraClick }: AlertCardProps) {
  const config = alertTypeConfig[alert.type] || alertTypeConfig.security;
  const Icon = config.icon;

  const handleCameraClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onCameraClick?.(alert.cameraId);
  };
  
  return (
    <div 
      className={cn(
        "glass-card p-4 cursor-pointer transition-all duration-300 hover:border-primary/50",
        !alert.isRead && "border-l-4 border-l-destructive bg-destructive/5"
      )}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <div className={cn("p-2 rounded-lg bg-secondary", config.color)}>
          <Icon className="w-5 h-5" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <Badge variant={severityConfig[alert.severity]}>
              {config.label}
            </Badge>
            <div className="flex items-center gap-1 text-muted-foreground text-xs">
              <Clock className="w-3 h-3" />
              {formatDistanceToNow(alert.timestamp, { addSuffix: true, locale: ptBR })}
            </div>
          </div>
          
          <p className="text-sm text-foreground mb-2 line-clamp-2">
            <HighlightText text={alert.message} highlight={searchQuery} />
          </p>
          
          <button
            onClick={handleCameraClick}
            className="flex items-center gap-1 text-muted-foreground text-xs hover:text-primary transition-colors"
            title="Filtrar por esta câmera"
          >
            <Camera className="w-3 h-3" />
            <HighlightText text={alert.cameraName} highlight={searchQuery} />
          </button>
        </div>
      </div>
    </div>
  );
}
