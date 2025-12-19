import { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

// Database types
export type DbRule = Tables<'rules'>;
export type DbRuleInsert = TablesInsert<'rules'>;
export type DbRuleUpdate = TablesUpdate<'rules'>;

// UI types that work with both DB and frontend
export type RuleCategory = 'security' | 'safety' | 'operations' | 'access' | 'analytics';
export type RuleSeverity = 'low' | 'medium' | 'high' | 'critical';
export type RuleActionType = 'alert' | 'notification' | 'record' | 'alarm';

export type RuleConditionType = 
  | 'people_count'
  | 'no_ppe'
  | 'restricted_area'
  | 'face_recognition'
  | 'vehicle_detection'
  | 'loitering'
  | 'crowd_density'
  | 'motion_detection'
  | 'object_left'
  | 'perimeter_breach';

export interface RuleCondition {
  type: RuleConditionType;
  operator: 'greater_than' | 'less_than' | 'equals' | 'between';
  value: number;
  value2?: number;
  duration?: number;
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
  conditions: RuleCondition[];
  actions: RuleActionType[];
  cameras: string[];
  schedule: RuleSchedule;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Map database rule to UI format
export function mapDbRuleToUI(dbRule: DbRule): UIRule {
  const conditions = Array.isArray(dbRule.conditions) ? dbRule.conditions : [];
  const scheduleRaw = dbRule.schedule as Record<string, unknown> | null;
  const schedule: RuleSchedule = {
    enabled: Boolean(scheduleRaw?.enabled),
    startTime: scheduleRaw?.startTime as string | undefined,
    endTime: scheduleRaw?.endTime as string | undefined,
    days: scheduleRaw?.days as number[] | undefined,
  };
  
  return {
    id: dbRule.id,
    name: dbRule.name,
    description: dbRule.description || '',
    category: dbRule.category as RuleCategory,
    severity: dbRule.severity as RuleSeverity,
    conditions: conditions.map((c: any) => ({
      type: c.type || 'people_count',
      operator: c.operator || 'greater_than',
      value: c.value || 0,
      value2: c.value2,
      duration: c.duration,
    })),
    actions: dbRule.actions.map(a => {
      if (a === 'notify') return 'notification';
      if (a === 'lockdown') return 'alarm';
      if (a === 'dispatch') return 'alert';
      return a as RuleActionType;
    }),
    cameras: dbRule.cameras,
    schedule: {
      enabled: schedule?.enabled ?? false,
      startTime: schedule?.startTime,
      endTime: schedule?.endTime,
      days: schedule?.days,
    },
    isActive: dbRule.is_active,
    createdAt: new Date(dbRule.created_at),
    updatedAt: new Date(dbRule.updated_at),
  };
}

// Map UI rule to DB format
export function mapUIRuleToDb(uiRule: Omit<UIRule, 'id' | 'createdAt' | 'updatedAt'>): DbRuleInsert {
  const dbActions = uiRule.actions.map(a => {
    if (a === 'notification') return 'notify';
    if (a === 'alarm') return 'lockdown';
    return a;
  }) as DbRuleInsert['actions'];

  return {
    name: uiRule.name,
    description: uiRule.description,
    category: uiRule.category,
    severity: uiRule.severity,
    conditions: uiRule.conditions as any,
    actions: dbActions,
    cameras: uiRule.cameras,
    schedule: uiRule.schedule as any,
    is_active: uiRule.isActive,
  };
}
