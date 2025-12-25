export interface CameraEvent { type: 'connected' | 'disconnected' | 'error' | 'snapshot'; cameraId: string; timestamp: Date; data?: any; }
export interface AlertEvent { type: 'new' | 'updated' | 'acknowledged' | 'deleted'; alertId: string; timestamp: Date; alert?: any; }
export interface RecordingEvent { type: 'started' | 'stopped' | 'completed' | 'failed'; recordingId: string; cameraId: string; timestamp: Date; }
export interface AuthEvent { type: 'login' | 'logout' | 'session_expired' | 'token_refreshed'; userId?: string; timestamp: Date; }
export interface SystemEvent { type: 'online' | 'offline' | 'error' | 'maintenance'; message?: string; timestamp: Date; }

export type AppEvent = CameraEvent | AlertEvent | RecordingEvent | AuthEvent | SystemEvent;
export type EventHandler<T extends AppEvent = AppEvent> = (event: T) => void;
export interface EventSubscription { unsubscribe: () => void; }
