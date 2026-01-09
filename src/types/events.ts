// Event Types - Projeto VISÃO
// Tipagem forte para eventos do sistema

export type EventType = 
  | 'alert.created'
  | 'alert.acknowledged'
  | 'alert.resolved'
  | 'camera.online'
  | 'camera.offline'
  | 'camera.error'
  | 'recognition.match'
  | 'recognition.unknown'
  | 'zone.entered'
  | 'zone.exited'
  | 'zone.violation'
  | 'recording.started'
  | 'recording.stopped'
  | 'system.error'
  | 'system.warning'
  | 'user.login'
  | 'user.logout';

export interface BaseEvent<T extends EventType, P = unknown> {
  type: T;
  payload: P;
  timestamp: Date;
  source: string;
  correlationId?: string;
}

export interface AlertEvent extends BaseEvent<'alert.created', {
  alertId: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  cameraId: string;
  imageUrl?: string;
}> {}

export interface CameraEvent extends BaseEvent<'camera.online' | 'camera.offline' | 'camera.error', {
  cameraId: string;
  status: string;
  error?: string;
}> {}

export interface RecognitionEvent extends BaseEvent<'recognition.match' | 'recognition.unknown', {
  personId?: string;
  confidence: number;
  cameraId: string;
  faceBox: { x: number; y: number; width: number; height: number };
}> {}

export interface ZoneEvent extends BaseEvent<'zone.entered' | 'zone.exited' | 'zone.violation', {
  zoneId: string;
  cameraId: string;
  objectId?: string;
  count?: number;
}> {}

export type SystemEvent = AlertEvent | CameraEvent | RecognitionEvent | ZoneEvent;

export type EventHandler<E extends SystemEvent> = (event: E) => void | Promise<void>;

export interface EventSubscription {
  unsubscribe: () => void;
}

export interface EventEmitter {
  emit: <E extends SystemEvent>(event: E) => void;
  on: <E extends SystemEvent>(type: E['type'], handler: EventHandler<E>) => EventSubscription;
  off: <E extends SystemEvent>(type: E['type'], handler: EventHandler<E>) => void;
}
