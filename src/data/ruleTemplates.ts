/**
 * Templates de regras pré-configuradas para casos comuns
 */

import { Database } from '@/integrations/supabase/types';

type RuleCategory = Database['public']['Enums']['rule_category'];
type RuleSeverity = Database['public']['Enums']['rule_severity'];
type RuleAction = Database['public']['Enums']['rule_action'];
type ConditionType = Database['public']['Enums']['condition_type'];

export interface RuleTemplate {
  id: string;
  name: string;
  description: string;
  category: RuleCategory;
  severity: RuleSeverity;
  conditions: {
    type: ConditionType;
    operator: string;
    value: number | string;
  }[];
  actions: RuleAction[];
  icon: string;
  color: string;
}

export const ruleTemplates: RuleTemplate[] = [
  // Segurança
  {
    id: 'intrusion-detection',
    name: 'Detecção de Intrusos',
    description: 'Alerta quando movimento é detectado em áreas restritas fora do horário comercial',
    category: 'security',
    severity: 'critical',
    conditions: [
      { type: 'motion_detection', operator: 'equals', value: 1 },
      { type: 'restricted_area', operator: 'equals', value: 1 }
    ],
    actions: ['alert', 'notify', 'record'],
    icon: 'ShieldAlert',
    color: 'red'
  },
  {
    id: 'perimeter-breach',
    name: 'Violação de Perímetro',
    description: 'Detecta quando alguém cruza o perímetro de segurança definido',
    category: 'security',
    severity: 'critical',
    conditions: [
      { type: 'perimeter_breach', operator: 'equals', value: 1 }
    ],
    actions: ['alert', 'notify', 'record', 'lockdown'],
    icon: 'Shield',
    color: 'red'
  },
  {
    id: 'loitering-alert',
    name: 'Permanência Suspeita',
    description: 'Alerta quando pessoa permanece em área por tempo prolongado',
    category: 'security',
    severity: 'high',
    conditions: [
      { type: 'loitering', operator: 'greater_than', value: 300 }
    ],
    actions: ['alert', 'notify'],
    icon: 'Clock',
    color: 'orange'
  },
  {
    id: 'abandoned-object',
    name: 'Objeto Abandonado',
    description: 'Detecta objetos deixados sem supervisão em áreas monitoradas',
    category: 'security',
    severity: 'high',
    conditions: [
      { type: 'object_left', operator: 'greater_than', value: 60 }
    ],
    actions: ['alert', 'notify', 'record'],
    icon: 'Package',
    color: 'orange'
  },

  // Segurança do Trabalho (Safety)
  {
    id: 'ppe-monitoring',
    name: 'Monitoramento de EPIs',
    description: 'Alerta quando trabalhadores não estão usando equipamentos de proteção',
    category: 'safety',
    severity: 'high',
    conditions: [
      { type: 'no_ppe', operator: 'equals', value: 1 }
    ],
    actions: ['alert', 'notify'],
    icon: 'HardHat',
    color: 'yellow'
  },
  {
    id: 'crowding-alert',
    name: 'Aglomeração Perigosa',
    description: 'Detecta quando há muitas pessoas em área com limite de capacidade',
    category: 'safety',
    severity: 'high',
    conditions: [
      { type: 'crowd_density', operator: 'greater_than', value: 80 }
    ],
    actions: ['alert', 'notify'],
    icon: 'Users',
    color: 'yellow'
  },
  {
    id: 'restricted-zone-entry',
    name: 'Entrada em Zona de Risco',
    description: 'Alerta quando pessoa entra em zona de risco sem autorização',
    category: 'safety',
    severity: 'critical',
    conditions: [
      { type: 'restricted_area', operator: 'equals', value: 1 }
    ],
    actions: ['alert', 'notify', 'record'],
    icon: 'AlertTriangle',
    color: 'red'
  },

  // Controle de Acesso
  {
    id: 'face-recognition-access',
    name: 'Acesso por Reconhecimento Facial',
    description: 'Controla acesso baseado em reconhecimento facial de pessoas autorizadas',
    category: 'access',
    severity: 'medium',
    conditions: [
      { type: 'face_recognition', operator: 'equals', value: 1 }
    ],
    actions: ['alert', 'record'],
    icon: 'Scan',
    color: 'blue'
  },
  {
    id: 'unauthorized-access',
    name: 'Acesso Não Autorizado',
    description: 'Alerta quando pessoa não reconhecida tenta acessar área restrita',
    category: 'access',
    severity: 'critical',
    conditions: [
      { type: 'face_recognition', operator: 'equals', value: 0 },
      { type: 'restricted_area', operator: 'equals', value: 1 }
    ],
    actions: ['alert', 'notify', 'record', 'lockdown'],
    icon: 'UserX',
    color: 'red'
  },
  {
    id: 'vehicle-access',
    name: 'Controle de Veículos',
    description: 'Monitora entrada e saída de veículos com reconhecimento de placas',
    category: 'access',
    severity: 'low',
    conditions: [
      { type: 'vehicle_detection', operator: 'equals', value: 1 }
    ],
    actions: ['alert', 'record'],
    icon: 'Car',
    color: 'green'
  },

  // Operações
  {
    id: 'people-counting',
    name: 'Contagem de Pessoas',
    description: 'Monitora quantidade de pessoas em áreas específicas',
    category: 'operations',
    severity: 'low',
    conditions: [
      { type: 'people_count', operator: 'greater_than', value: 0 }
    ],
    actions: ['record'],
    icon: 'Users',
    color: 'blue'
  },
  {
    id: 'capacity-limit',
    name: 'Limite de Capacidade',
    description: 'Alerta quando área atinge capacidade máxima definida',
    category: 'operations',
    severity: 'medium',
    conditions: [
      { type: 'people_count', operator: 'greater_than', value: 50 }
    ],
    actions: ['alert', 'notify'],
    icon: 'TrendingUp',
    color: 'orange'
  },

  // Analytics
  {
    id: 'traffic-analysis',
    name: 'Análise de Tráfego',
    description: 'Coleta dados de movimentação para análise de padrões',
    category: 'analytics',
    severity: 'low',
    conditions: [
      { type: 'motion_detection', operator: 'equals', value: 1 }
    ],
    actions: ['record'],
    icon: 'BarChart',
    color: 'purple'
  },

  // Monuv-inspired: Absence Detection
  {
    id: 'absence-detection',
    name: 'Detecção de Ausência',
    description: 'Alerta quando posto de trabalho está vazio por tempo excessivo',
    category: 'operations',
    severity: 'medium',
    conditions: [
      { type: 'absence_detection', operator: 'greater_than', value: 600 }
    ],
    actions: ['alert', 'notify'],
    icon: 'UserX',
    color: 'yellow'
  },
  {
    id: 'agglomeration-alert',
    name: 'Detecção de Aglomeração',
    description: 'Alerta quando aglomeração é detectada acima do limite seguro',
    category: 'safety',
    severity: 'high',
    conditions: [
      { type: 'agglomeration_detection', operator: 'greater_than', value: 10 }
    ],
    actions: ['alert', 'notify'],
    icon: 'Users',
    color: 'orange'
  },
  {
    id: 'anomaly-position',
    name: 'Anomalia de Posição',
    description: 'Detecta posicionamento irregular ou suspeito de pessoa',
    category: 'security',
    severity: 'high',
    conditions: [
      { type: 'anomaly_position', operator: 'equals', value: 1 }
    ],
    actions: ['alert', 'notify', 'record'],
    icon: 'AlertTriangle',
    color: 'red'
  },
  {
    id: 'anomaly-speed',
    name: 'Anomalia de Velocidade',
    description: 'Detecta velocidade irregular de movimentação (corrida, fuga)',
    category: 'security',
    severity: 'high',
    conditions: [
      { type: 'anomaly_speed', operator: 'greater_than', value: 1 }
    ],
    actions: ['alert', 'notify', 'record'],
    icon: 'Zap',
    color: 'red'
  },
  {
    id: 'anomaly-displacement',
    name: 'Anomalia de Deslocamento',
    description: 'Detecta padrão de deslocamento suspeito ou irregular',
    category: 'security',
    severity: 'medium',
    conditions: [
      { type: 'anomaly_displacement', operator: 'equals', value: 1 }
    ],
    actions: ['alert', 'notify'],
    icon: 'TrendingUp',
    color: 'orange'
  },
  {
    id: 'scene-change',
    name: 'Mudança de Cena',
    description: 'Detecta quando a câmera foi movida, obstruída ou adulterada',
    category: 'security',
    severity: 'critical',
    conditions: [
      { type: 'scene_change', operator: 'equals', value: 1 }
    ],
    actions: ['alert', 'notify', 'record'],
    icon: 'Camera',
    color: 'red'
  },
  {
    id: 'recurrent-vehicle',
    name: 'Veículo Recorrente',
    description: 'Detecta veículo com frequência de passagem acima do padrão',
    category: 'security',
    severity: 'medium',
    conditions: [
      { type: 'recurrent_vehicle', operator: 'greater_than', value: 3 }
    ],
    actions: ['alert', 'notify'],
    icon: 'Car',
    color: 'orange'
  }
];

export const getCategoryLabel = (category: RuleCategory): string => {
  const labels: Record<RuleCategory, string> = {
    security: 'Segurança',
    safety: 'Segurança do Trabalho',
    operations: 'Operações',
    access: 'Controle de Acesso',
    analytics: 'Analytics'
  };
  return labels[category];
};

export const getSeverityLabel = (severity: RuleSeverity): string => {
  const labels: Record<RuleSeverity, string> = {
    low: 'Baixa',
    medium: 'Média',
    high: 'Alta',
    critical: 'Crítica'
  };
  return labels[severity];
};
