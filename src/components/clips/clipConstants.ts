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
  manual: 'bg-blue-500',
  alert: 'bg-yellow-500',
  motion: 'bg-purple-500',
  schedule: 'bg-green-500',
  rule: 'bg-orange-500',
  api: 'bg-cyan-500',
};
