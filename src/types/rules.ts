// Rule Types - Projeto VISÃO
// Tipagem forte para regras de automação

export interface Rule {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  trigger: RuleTrigger;
  conditions: RuleCondition[];
  actions: RuleAction[];
  schedule?: RuleSchedule;
  priority: number;
  createdAt: Date;
  updatedAt: Date;
}

export type RuleTriggerType = 
  | 'alert_created'
  | 'person_detected'
  | 'zone_violation'
  | 'camera_offline'
  | 'schedule'
  | 'manual';

export interface RuleTrigger {
  type: RuleTriggerType;
  config: Record<string, unknown>;
}

export type RuleConditionOperator = 
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'greater_than'
  | 'less_than'
  | 'in'
  | 'not_in';

export interface RuleCondition {
  field: string;
  operator: RuleConditionOperator;
  value: string | number | boolean | string[];
  logicalOperator?: 'and' | 'or';
}

export type RuleActionType = 
  | 'send_notification'
  | 'send_email'
  | 'send_telegram'
  | 'create_clip'
  | 'trigger_alarm'
  | 'call_webhook'
  | 'execute_script';

export interface RuleAction {
  type: RuleActionType;
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

export interface RuleSchedule {
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
