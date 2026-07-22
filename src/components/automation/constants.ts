/**
 * VISÃO - Automation Rules Constants
 */
import { Shield, AlertTriangle, Settings2, Camera, Zap } from 'lucide-react';

export const CATEGORIES = [
  { value: 'security', label: 'Segurança', icon: Shield },
  { value: 'safety', label: 'Segurança do Trabalho', icon: AlertTriangle },
  { value: 'operations', label: 'Operações', icon: Settings2 },
  { value: 'access', label: 'Controle de Acesso', icon: Camera },
  { value: 'analytics', label: 'Analytics', icon: Zap },
];

export const SEVERITIES = [
  { value: 'low', label: 'Baixa', color: 'bg-primary' },
  { value: 'medium', label: 'Média', color: 'bg-warning' },
  { value: 'high', label: 'Alta', color: 'bg-warning' },
  { value: 'critical', label: 'Crítica', color: 'bg-destructive' },
];

export const CONDITION_TYPES = [
  { value: 'people_count', label: 'Contagem de Pessoas' },
  { value: 'no_ppe', label: 'Ausência de EPI' },
  { value: 'restricted_area', label: 'Área Restrita' },
  { value: 'face_recognition', label: 'Reconhecimento Facial' },
  { value: 'vehicle_detection', label: 'Detecção de Veículo' },
  { value: 'loitering', label: 'Permanência Prolongada' },
  { value: 'crowd_density', label: 'Densidade de Multidão' },
  { value: 'motion_detection', label: 'Detecção de Movimento' },
  { value: 'object_left', label: 'Objeto Abandonado' },
  { value: 'perimeter_breach', label: 'Violação de Perímetro' },
  { value: 'absence_detection', label: 'Detecção de Ausência' },
  { value: 'agglomeration_detection', label: 'Detecção de Aglomeração' },
  { value: 'anomaly_position', label: 'Anomalia: Posição Irregular' },
  { value: 'anomaly_speed', label: 'Anomalia: Velocidade Irregular' },
  { value: 'anomaly_displacement', label: 'Anomalia: Deslocamento Suspeito' },
  { value: 'scene_change', label: 'Mudança de Cena' },
  { value: 'recurrent_vehicle', label: 'Veículo Recorrente' },
];

export const ACTIONS = [
  { value: 'alert', label: 'Criar Alerta', description: 'Registra um alerta no sistema' },
  { value: 'notify', label: 'Enviar Notificação', description: 'Notifica via canais configurados' },
  { value: 'record', label: 'Iniciar Gravação', description: 'Começa a gravar a câmera' },
  { value: 'lockdown', label: 'Modo Lockdown', description: 'Ativa modo de emergência' },
  { value: 'dispatch', label: 'Despachar Segurança', description: 'Notifica equipe de segurança' },
  { value: 'arm', label: 'Armar Câmera', description: 'Ativa monitoramento da câmera' },
  { value: 'disarm', label: 'Desarmar Câmera', description: 'Desativa monitoramento da câmera' },
  { value: 'panic', label: 'Alerta de Pânico', description: 'Dispara alerta de pânico geral' },
];

export const DAYS_OF_WEEK = [
  { value: 0, label: 'Dom' },
  { value: 1, label: 'Seg' },
  { value: 2, label: 'Ter' },
  { value: 3, label: 'Qua' },
  { value: 4, label: 'Qui' },
  { value: 5, label: 'Sex' },
  { value: 6, label: 'Sáb' },
];

export interface RuleFormData {
  name: string;
  description: string;
  category: string;
  severity: string;
  conditions: Array<{ type: string; operator: string; value: string }>;
  actions: string[];
  cameras: string[];
  zone_id: string | null;
  schedule: {
    enabled: boolean;
    days: number[];
    start_time: string;
    end_time: string;
  };
  is_active: boolean;
}

export const defaultFormData: RuleFormData = {
  name: '',
  description: '',
  category: 'security',
  severity: 'medium',
  conditions: [],
  actions: ['alert'],
  cameras: [],
  zone_id: null,
  schedule: {
    enabled: false,
    days: [1, 2, 3, 4, 5],
    start_time: '08:00',
    end_time: '18:00',
  },
  is_active: true,
};
