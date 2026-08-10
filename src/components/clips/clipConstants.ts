import { Hand, AlertTriangle, Eye, Calendar, Zap, Video } from 'lucide-react';
import { RecordingTrigger } from '@/types/clips';

export const triggerIcons: Record<RecordingTrigger, React.ElementType> = {
  manual: Hand,
  alert: AlertTriangle,
  motion: Eye,
  schedule: Calendar,
  rule: Zap,
  api: Video,
};

export const triggerLabels: Record<RecordingTrigger, string> = {
  manual: 'Manual',
  alert: 'Alerta',
  motion: 'Movimento',
  schedule: 'Agendado',
  rule: 'Regra',
  api: 'API',
};

export const triggerColors: Record<RecordingTrigger, string> = {
  manual: 'bg-primary',
  alert: 'bg-warning',
  motion: 'bg-primary/70',
  schedule: 'bg-success',
  rule: 'bg-warning',
  api: 'bg-accent',
};
