/**
 * VISÃO - Types barrel export
 */

export * from './clips';
export * from './continuousAnalysis';
export * from './faceRecognition';
export * from './rules';
export * from './streaming';

// ./surveillance: Rule, RuleCondition, RuleConditionType collide with ./rules
export type {
  Camera,
  CameraStatus,
  Alert,
  AlertSeverity,
  AlertType,
  AnalyticsData,
} from './surveillance';

export * from './themes';
export * from './widgets';
export * from './zones';
