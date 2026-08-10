/**
 * VISÃO - RuleEditor Constants & Types
 */
import {
  RuleCategory,
  RuleSeverity,
  RuleActionType,
  RuleConditionType,
  RuleCondition,
} from '@/types/rules';
import { conditionTypeLabels } from '@/data/mockRules';

export const categories: { value: RuleCategory; label: string }[] = [
  { value: 'security', label: 'Segurança' },
  { value: 'safety', label: 'Segurança do Trabalho' },
  { value: 'operations', label: 'Operações' },
  { value: 'access', label: 'Acesso' },
  { value: 'analytics', label: 'Analytics' },
];

export const severities: { value: RuleSeverity; label: string }[] = [
  { value: 'low', label: 'Baixa' },
  { value: 'medium', label: 'Média' },
  { value: 'high', label: 'Alta' },
  { value: 'critical', label: 'Crítica' },
];

export const actions: { value: RuleActionType; label: string }[] = [
  { value: 'alert', label: 'Gerar Alerta' },
  { value: 'notify', label: 'Enviar Notificação' },
  { value: 'record', label: 'Gravar Vídeo' },
  { value: 'arm', label: 'Disparar Alarme' },
];

export const conditionTypes = Object.entries(conditionTypeLabels).map(([value, info]) => ({
  value: value as RuleConditionType,
  label: info.label,
  description: info.description,
}));

export const operators = [
  { value: 'greater_than', label: 'Maior que' },
  { value: 'less_than', label: 'Menor que' },
  { value: 'equals', label: 'Igual a' },
  { value: 'between', label: 'Entre' },
];

export const weekDays = [
  { value: 0, label: 'Dom' },
  { value: 1, label: 'Seg' },
  { value: 2, label: 'Ter' },
  { value: 3, label: 'Qua' },
  { value: 4, label: 'Qui' },
  { value: 5, label: 'Sex' },
  { value: 6, label: 'Sáb' },
];

export interface RuleEditorFormData {
  name: string;
  description: string;
  category: RuleCategory;
  severity: RuleSeverity;
  conditions: RuleCondition[];
  actions: RuleActionType[];
  cameras: string[];
  schedule: {
    enabled: boolean;
    startTime: string;
    endTime: string;
    days: number[];
  };
  isActive: boolean;
}

export const defaultRule: RuleEditorFormData = {
  name: '',
  description: '',
  category: 'security',
  severity: 'medium',
  conditions: [],
  actions: ['alert'],
  cameras: [],
  schedule: {
    enabled: false,
    startTime: '08:00',
    endTime: '18:00',
    days: [1, 2, 3, 4, 5],
  },
  isActive: true,
};
