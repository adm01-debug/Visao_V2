import { Rule } from '@/types/surveillance';

export const mockRules: Rule[] = [
  {
    id: 'rule-001',
    name: 'Aglomeração na Produção',
    description: 'Detecta quando há mais de 5 pessoas paradas conversando por mais de 3 minutos',
    category: 'productivity',
    severity: 'medium',
    conditions: [
      {
        type: 'people_count',
        operator: 'greater_than',
        value: 5,
        duration: 180,
      },
      {
        type: 'idle_time',
        operator: 'greater_than',
        value: 180,
      },
    ],
    actions: ['alert', 'notification'],
    cameras: ['cam-002', 'cam-005'],
    schedule: {
      enabled: true,
      startTime: '08:00',
      endTime: '18:00',
      days: [1, 2, 3, 4, 5],
    },
    isActive: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
  },
  {
    id: 'rule-002',
    name: 'Sem EPI na Área de Produção',
    description: 'Alerta quando colaborador é detectado sem equipamento de proteção individual',
    category: 'safety',
    severity: 'high',
    conditions: [
      {
        type: 'no_ppe',
        operator: 'equals',
        value: 1,
      },
    ],
    actions: ['alert', 'notification', 'record'],
    cameras: ['cam-002', 'cam-004', 'cam-008'],
    schedule: {
      enabled: false,
    },
    isActive: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
  },
  {
    id: 'rule-003',
    name: 'Movimento Noturno',
    description: 'Detecta qualquer movimento nas áreas internas fora do horário comercial',
    category: 'security',
    severity: 'critical',
    conditions: [
      {
        type: 'after_hours_movement',
        operator: 'equals',
        value: 1,
      },
    ],
    actions: ['alert', 'notification', 'record', 'alarm'],
    cameras: [],
    schedule: {
      enabled: true,
      startTime: '22:00',
      endTime: '06:00',
      days: [0, 1, 2, 3, 4, 5, 6],
    },
    isActive: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5),
  },
  {
    id: 'rule-004',
    name: 'Acesso Não Autorizado',
    description: 'Detecta pessoas em áreas restritas sem autorização',
    category: 'intrusion',
    severity: 'critical',
    conditions: [
      {
        type: 'restricted_area',
        operator: 'equals',
        value: 1,
      },
      {
        type: 'unauthorized_access',
        operator: 'equals',
        value: 1,
      },
    ],
    actions: ['alert', 'notification', 'record', 'alarm'],
    cameras: ['cam-004'],
    schedule: {
      enabled: false,
    },
    isActive: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 21),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 48),
  },
  {
    id: 'rule-005',
    name: 'Vadiagem no Estacionamento',
    description: 'Detecta pessoas paradas no estacionamento por mais de 10 minutos',
    category: 'security',
    severity: 'low',
    conditions: [
      {
        type: 'loitering',
        operator: 'greater_than',
        value: 600,
      },
    ],
    actions: ['notification'],
    cameras: ['cam-003'],
    schedule: {
      enabled: false,
    },
    isActive: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
  },
];

export const conditionTypeLabels: Record<string, { label: string; description: string }> = {
  people_count: { label: 'Contagem de Pessoas', description: 'Número de pessoas detectadas na área' },
  idle_time: { label: 'Tempo Ocioso', description: 'Tempo que pessoas ficam paradas (segundos)' },
  restricted_area: { label: 'Área Restrita', description: 'Detecção em área marcada como restrita' },
  no_ppe: { label: 'Sem EPI', description: 'Pessoa sem equipamento de proteção' },
  crowd_detection: { label: 'Multidão', description: 'Aglomeração acima do normal' },
  after_hours_movement: { label: 'Movimento Fora do Horário', description: 'Qualquer movimento fora do expediente' },
  unauthorized_access: { label: 'Acesso Não Autorizado', description: 'Pessoa não identificada em área controlada' },
  loitering: { label: 'Vadiagem', description: 'Pessoa parada por tempo prolongado' },
  running: { label: 'Correndo', description: 'Pessoa correndo na área monitorada' },
  fighting: { label: 'Briga', description: 'Comportamento agressivo detectado' },
};
