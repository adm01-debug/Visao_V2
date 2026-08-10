// Rule Types - Projeto VISÃO
// Tipagem forte para regras de automação

import type { Tables, TablesInsert, TablesUpdate, Database } from '@/integrations/supabase/types';

// ==========================================
// DB Types (from Supabase schema)
// ==========================================
export type DbRule = Tables<'rules'>;
export type DbRuleInsert = TablesInsert<'rules'>;
export type DbRuleUpdate = TablesUpdate<'rules'>;

export type RuleCategory = Database['public']['Enums']['rule_category'];
export type RuleSeverity = Database['public']['Enums']['rule_severity'];
export type RuleActionType = Database['public']['Enums']['rule_action'];
export type RuleConditionType = Database['public']['Enums']['condition_type'];
export type RuleConditionOperator = Database['public']['Enums']['condition_operator'];

// ==========================================
// UI Types (used by components)
// ==========================================
export interface RuleCondition {
  type: RuleConditionType;
  operator: RuleConditionOperator;
  value: string | number;
  value2?: string | number; // for "between"
}

export interface RuleSchedule {
  enabled: boolean;
  startTime?: string;
  endTime?: string;
  days?: number[];
}

export interface UIRule {
  id: string;
  name: string;
  description: string;
  category: RuleCategory;
  severity: RuleSeverity;
  isActive: boolean;
  conditions: RuleCondition[];
  actions: RuleActionType[];
  cameras: string[];
  schedule: RuleSchedule;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// Mapping functions DB <-> UI
// ==========================================
export function mapDbRuleToUI(db: DbRule): UIRule {
  const schedule = (db.schedule as Record<string, unknown>) || {};
  return {
    id: db.id,
    name: db.name,
    description: db.description || '',
    category: db.category,
    severity: db.severity,
    isActive: db.is_active,
    conditions: Array.isArray(db.conditions) ? (db.conditions as unknown as RuleCondition[]) : [],
    actions: db.actions || [],
    cameras: db.cameras || [],
    schedule: {
      enabled: (schedule.enabled as boolean) || false,
      startTime: (schedule.startTime as string) || '08:00',
      endTime: (schedule.endTime as string) || '18:00',
      days: (schedule.days as number[]) || [1, 2, 3, 4, 5],
    },
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

export function mapUIRuleToDb(
  ui: Omit<UIRule, 'id' | 'createdAt' | 'updatedAt'>
): Omit<DbRuleInsert, 'user_id'> {
  return {
    name: ui.name,
    description: ui.description || null,
    category: ui.category,
    severity: ui.severity,
    is_active: ui.isActive,
    conditions:
      ui.conditions as unknown as Database['public']['Tables']['rules']['Insert']['conditions'],
    actions: ui.actions,
    cameras: ui.cameras,
    schedule: ui.schedule as unknown as Database['public']['Tables']['rules']['Insert']['schedule'],
  };
}

// ==========================================
// Legacy types (kept for compatibility)
// ==========================================
export interface Rule {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  trigger: RuleTrigger;
  conditions: RuleLegacyCondition[];
  actions: RuleLegacyAction[];
  schedule?: RuleLegacySchedule;
  priority: number;
  createdAt: Date;
  updatedAt: Date;
}

export type RuleTriggerType =
  'alert_created' | 'person_detected' | 'zone_violation' | 'camera_offline' | 'schedule' | 'manual';

export interface RuleTrigger {
  type: RuleTriggerType;
  config: Record<string, unknown>;
}

export type RuleLegacyConditionOperator =
  'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'in' | 'not_in';

export interface RuleLegacyCondition {
  field: string;
  operator: RuleLegacyConditionOperator;
  value: string | number | boolean | string[];
  logicalOperator?: 'and' | 'or';
}

export type RuleLegacyActionType =
  | 'send_notification'
  | 'send_email'
  | 'send_telegram'
  | 'create_clip'
  | 'trigger_alarm'
  | 'call_webhook'
  | 'execute_script';

export interface RuleLegacyAction {
  type: RuleLegacyActionType;
  config: RuleActionConfig;
  delay?: number;
}

export interface RuleActionConfig {
  recipients?: string[];
  template?: string;
  webhookUrl?: string;
  duration?: number;
  message?: string;
  [key: string]: unknown;
}

export interface RuleLegacySchedule {
  type: 'always' | 'time_range' | 'cron';
  startTime?: string;
  endTime?: string;
  daysOfWeek?: number[];
  cron?: string;
  timezone?: string;
}

export interface RuleViolation {
  id: string;
  ruleId: string;
  triggeredAt: Date;
  context: Record<string, unknown>;
  actionsExecuted: string[];
  status: 'pending' | 'executed' | 'failed';
}
