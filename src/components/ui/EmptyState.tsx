import React from 'react';
import { motion } from 'framer-motion';
import { 
  Camera, 
  Bell, 
  Users, 
  MapPin, 
  Activity,
  Shield,
  Search,
  Plus,
  AlertTriangle,
  CheckCircle,
  FileText,
  Video,
  Car
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type EmptyStateType = 
  | 'cameras' 
  | 'alerts' 
  | 'people' 
  | 'zones' 
  | 'search' 
  | 'activity'
  | 'notifications'
  | 'reports'
  | 'videos'
  | 'vehicles'
  | 'success'
  | 'error';

interface EmptyStateProps {
  type: EmptyStateType;
  title?: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const emptyStateConfigs: Record<EmptyStateType, {
  icon: React.ElementType;
  defaultTitle: string;
  defaultDescription: string;
  gradient: string;
  iconColor: string;
}> = {
  cameras: {
    icon: Camera,
    defaultTitle: 'Nenhuma câmera encontrada',
    defaultDescription: 'Adicione sua primeira câmera para começar o monitoramento em tempo real.',
    gradient: 'from-primary/20 to-primary/5',
    iconColor: 'text-primary',
  },
  alerts: {
    icon: Bell,
    defaultTitle: 'Nenhum alerta ativo',
    defaultDescription: 'Tudo tranquilo! Você será notificado quando houver novos alertas.',
    gradient: 'from-success/20 to-success/5',
    iconColor: 'text-success',
  },
  people: {
    icon: Users,
    defaultTitle: 'Nenhuma pessoa cadastrada',
    defaultDescription: 'Cadastre pessoas para reconhecimento facial e controle de acesso.',
    gradient: 'from-secondary/20 to-secondary/5',
    iconColor: 'text-secondary-foreground',
  },
  zones: {
    icon: MapPin,
    defaultTitle: 'Nenhuma zona configurada',
    defaultDescription: 'Crie zonas de monitoramento para detectar atividades específicas.',
    gradient: 'from-warning/20 to-warning/5',
    iconColor: 'text-warning',
  },
  activity: {
    icon: Activity,
    defaultTitle: 'Nenhuma atividade recente',
    defaultDescription: 'As atividades detectadas aparecerão aqui em tempo real.',
    gradient: 'from-accent/20 to-accent/5',
    iconColor: 'text-accent-foreground',
  },
  search: {
    icon: Search,
    defaultTitle: 'Nenhum resultado encontrado',
    defaultDescription: 'Tente ajustar os filtros ou termos de busca.',
    gradient: 'from-muted/30 to-muted/10',
    iconColor: 'text-muted-foreground',
  },
  notifications: {
    icon: Shield,
    defaultTitle: 'Sem notificações',
    defaultDescription: 'Você está em dia! Novas notificações aparecerão aqui.',
    gradient: 'from-primary/20 to-primary/5',
    iconColor: 'text-primary',
  },
  reports: {
    icon: FileText,
    defaultTitle: 'Nenhum relatório disponível',
    defaultDescription: 'Gere relatórios para visualizar métricas e insights do sistema.',
    gradient: 'from-secondary/20 to-secondary/5',
    iconColor: 'text-secondary-foreground',
  },
  videos: {
    icon: Video,
    defaultTitle: 'Nenhuma gravação encontrada',
    defaultDescription: 'As gravações de vídeo aparecerão aqui quando disponíveis.',
    gradient: 'from-accent/20 to-accent/5',
    iconColor: 'text-accent-foreground',
  },
  vehicles: {
    icon: Car,
    defaultTitle: 'Nenhum veículo detectado',
    defaultDescription: 'Veículos detectados e placas reconhecidas aparecerão aqui.',
    gradient: 'from-warning/20 to-warning/5',
    iconColor: 'text-warning',
  },
  success: {
    icon: CheckCircle,
    defaultTitle: 'Operação concluída',
    defaultDescription: 'A ação foi executada com sucesso.',
    gradient: 'from-success/20 to-success/5',
    iconColor: 'text-success',
  },
  error: {
    icon: AlertTriangle,
    defaultTitle: 'Algo deu errado',
    defaultDescription: 'Ocorreu um erro inesperado. Tente novamente.',
    gradient: 'from-destructive/20 to-destructive/5',
    iconColor: 'text-destructive',
  },
};

const sizeClasses = {
  sm: {
    container: 'py-6 px-4',
    iconWrapper: 'w-12 h-12',
    icon: 'w-6 h-6',
    title: 'text-base',
    description: 'text-sm',
  },
  md: {
    container: 'py-10 px-6',
    iconWrapper: 'w-16 h-16',
    icon: 'w-8 h-8',
    title: 'text-lg',
    description: 'text-sm',
  },
  lg: {
    container: 'py-16 px-8',
    iconWrapper: 'w-20 h-20',
    icon: 'w-10 h-10',
    title: 'text-xl',
    description: 'text-base',
  },
};

export function EmptyState({
  type,
  title,
  description,
  action,
  secondaryAction,
  className,
  size = 'md',
}: EmptyStateProps) {
  const config = emptyStateConfigs[type];
  const Icon = config.icon;
  const sizes = sizeClasses[size];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className={cn(
        'flex flex-col items-center justify-center text-center',
        sizes.container,
        className
      )}
    >
      {/* Animated Icon Container */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.3, type: 'spring', stiffness: 200 }}
        className={cn(
          'relative rounded-full bg-gradient-to-br flex items-center justify-center mb-4',
          config.gradient,
          sizes.iconWrapper
        )}
      >
        {/* Pulse ring animation */}
        <motion.div
          className={cn(
            'absolute inset-0 rounded-full bg-gradient-to-br opacity-50',
            config.gradient
          )}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.5, 0, 0.5],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        <Icon className={cn(sizes.icon, config.iconColor)} />
      </motion.div>

      {/* Title */}
      <motion.h3
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.3 }}
        className={cn('font-semibold text-foreground mb-2', sizes.title)}
      >
        {title || config.defaultTitle}
      </motion.h3>

      {/* Description */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.3 }}
        className={cn('text-muted-foreground max-w-sm mb-4', sizes.description)}
      >
        {description || config.defaultDescription}
      </motion.p>

      {/* Actions */}
      {(action || secondaryAction) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.3 }}
          className="flex flex-col sm:flex-row gap-2 mt-2"
        >
          {action && (
            <Button 
              onClick={action.onClick}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button 
              variant="outline" 
              onClick={secondaryAction.onClick}
            >
              {secondaryAction.label}
            </Button>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}
