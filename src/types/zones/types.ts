/**
 * VISÃO - Zone Types
 * Core type definitions for zone detection system
 */

// ============================================
// ENUMS & BASE TYPES
// ============================================

export type ZoneShape = 'polygon' | 'rectangle' | 'circle' | 'line';

export type ZoneType =
  | 'restricted'
  | 'counting'
  | 'tripwire'
  | 'dwell'
  | 'occupancy'
  | 'parking'
  | 'queue'
  | 'safety'
  | 'custom';

export type TripwireDirection =
  'both' | 'left-to-right' | 'right-to-left' | 'top-to-bottom' | 'bottom-to-top';

export type ZoneEventType =
  | 'enter'
  | 'exit'
  | 'cross_line'
  | 'dwell_time'
  | 'occupancy'
  | 'count_in'
  | 'count_out'
  | 'crowd_density'
  | 'loitering'
  | 'wrong_direction'
  | 'ppe_violation';

export interface Point {
  x: number;
  y: number;
}

export interface ZoneGeometry {
  shape: ZoneShape;
  points: Point[];
  center?: Point;
  radius?: number;
}

// ============================================
// ZONE & CONFIG
// ============================================

export interface Zone {
  id: string;
  cameraId: string;
  name: string;
  description?: string;
  type: ZoneType;
  geometry: ZoneGeometry;
  color: string;
  opacity: number;
  enabled: boolean;
  config: ZoneConfig;
  rules: ZoneRule[];
  stats?: ZoneStats;
  createdAt: Date;
  updatedAt: Date;
}

export interface ZoneConfig {
  tripwireDirection?: TripwireDirection;
  maxOccupancy?: number;
  minOccupancy?: number;
  maxDwellTime?: number;
  minDwellTime?: number;
  maxQueueLength?: number;
  maxWaitTime?: number;
  isOccupied?: boolean;
  vehicleType?: 'car' | 'motorcycle' | 'truck' | 'any';
  requirePPE?: boolean;
  ppeTypes?: ('helmet' | 'vest' | 'glasses' | 'gloves' | 'boots')[];
  alertOnEnter?: boolean;
  alertOnExit?: boolean;
  alertOnDwell?: boolean;
  alertCooldown?: number;
  activeSchedule?: { enabled: boolean; startTime: string; endTime: string; days: number[] };
}

export interface ZoneRule {
  id: string;
  name: string;
  eventType: ZoneEventType;
  condition: {
    operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte' | 'between';
    value: number;
    value2?: number;
  };
  action: 'alert' | 'log' | 'notify' | 'trigger_recording';
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
}

// ============================================
// STATS & TRACKING
// ============================================

export interface ZoneStats {
  currentOccupancy: number;
  countIn: number;
  countOut: number;
  avgDwellTime: number;
  maxOccupancyToday: number;
  alertsToday: number;
  lastDetectionAt?: Date;
  currentObjects: TrackedObject[];
}

export interface TrackedObject {
  id: string;
  type: 'person' | 'vehicle' | 'object';
  position: Point;
  boundingBox: { x: number; y: number; width: number; height: number };
  enteredAt: Date;
  dwellTime: number;
  path?: Point[];
}

// ============================================
// EVENTS
// ============================================

export interface ZoneEvent {
  id: string;
  zoneId: string;
  zoneName: string;
  cameraId: string;
  eventType: ZoneEventType;
  object?: TrackedObject;
  value?: number;
  violatedRule?: ZoneRule;
  alertGenerated: boolean;
  snapshot?: string;
  timestamp: Date;
}

export interface ZoneDetectionConfig {
  detectionInterval: number;
  enterExitSensitivity: number;
  minOverlapThreshold: number;
  enableTracking: boolean;
  maxTrackedObjects: number;
  objectLostTimeout: number;
}

export const defaultZoneDetectionConfig: ZoneDetectionConfig = {
  detectionInterval: 500,
  enterExitSensitivity: 0.5,
  minOverlapThreshold: 0.3,
  enableTracking: true,
  maxTrackedObjects: 50,
  objectLostTimeout: 3000,
};

export interface ZoneEvents {
  onEnter?: (zone: Zone, object: TrackedObject) => void;
  onExit?: (zone: Zone, object: TrackedObject, dwellTime: number) => void;
  onLineCross?: (zone: Zone, object: TrackedObject, direction: string) => void;
  onOccupancyChange?: (zone: Zone, count: number, delta: number) => void;
  onMaxOccupancy?: (zone: Zone, count: number) => void;
  onDwellAlert?: (zone: Zone, object: TrackedObject, dwellTime: number) => void;
  onRuleViolation?: (zone: Zone, rule: ZoneRule, event: ZoneEvent) => void;
  onAlert?: (zone: Zone, event: ZoneEvent) => void;
}
