export type SocketEvent = 'connect' | 'disconnect' | 'error' | 'message' | 'camera:update' | 'alert:new' | 'recording:update';

export interface SocketMessage<T = any> { event: SocketEvent; data: T; timestamp: number; }
export interface SocketOptions { url: string; autoConnect?: boolean; reconnect?: boolean; reconnectAttempts?: number; reconnectDelay?: number; }
export interface SocketState { connected: boolean; connecting: boolean; error: Error | null; }

export interface SocketHandlers { onConnect?: () => void; onDisconnect?: (reason: string) => void; onError?: (error: Error) => void; onMessage?: (message: SocketMessage) => void; }

export type SocketCallback<T = any> = (data: T) => void;
export type SocketUnsubscribe = () => void;
