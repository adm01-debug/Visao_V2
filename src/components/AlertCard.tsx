import { Alert } from '@/types/surveillance';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, 
  Shield, 
  Clock, 
  Users, 
  Camera,
  ShieldAlert 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AlertCardProps {
  alert: Alert;
  onClick?: () => void;
}

const alertTypeConfig = {
  security: {
    icon: Shield,
    label: 'Segurança',
    color: 'text-destructive',
  },
  productivity: {
    icon: Users,
    label: 'Produtividade',
    color: 'text-warning',
  },
  safety: {
    icon: AlertTriangle,
    label: 'Segurança do Trabalho',
    color: 'text-warning',
  },
  intrusion: {
    icon: ShieldAlert,
    label: 'Intrusão',
    color: 'text-destructive',
  },
};

const severityConfig = {
  low: 'secondary',
  medium: 'warning',
  high: 'destructive',
  critical: 'alert',
} as const;

export function AlertCard({ alert, onClick }: AlertCardProps) {
  const config = alertTypeConfig[alert.type];
  const Icon = config.icon;
  
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
            {alert.message}
          </p>
          
          <div className="flex items-center gap-1 text-muted-foreground text-xs">
            <Camera className="w-3 h-3" />
            {alert.cameraName}
          </div>
        </div>
      </div>
    </div>
  );
}
