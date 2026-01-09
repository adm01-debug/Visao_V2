// WebSocket Service - Projeto VISÃO
// Serviço de WebSocket com tipagem forte

export type WSConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface WSMessage<T = unknown> {
  type: string;
  payload: T;
  timestamp: number;
  id?: string;
}

export interface WSConfig {
  url: string;
  reconnect: boolean;
  reconnectInterval: number;
  maxReconnectAttempts: number;
  heartbeatInterval: number;
}

export type WSMessageHandler<T = unknown> = (message: WSMessage<T>) => void;

export interface WebSocketService {
  connect: () => void;
  disconnect: () => void;
  send: <T>(type: string, payload: T) => void;
  subscribe: <T>(type: string, handler: WSMessageHandler<T>) => () => void;
  getState: () => WSConnectionState;
}

const defaultConfig: WSConfig = {
  url: '',
  reconnect: true,
  reconnectInterval: 3000,
  maxReconnectAttempts: 5,
  heartbeatInterval: 30000,
};

export const createWebSocketService = (config: Partial<WSConfig> = {}): WebSocketService => {
  const mergedConfig = { ...defaultConfig, ...config };
  let ws: WebSocket | null = null;
  let state: WSConnectionState = 'disconnected';
  let reconnectAttempts = 0;
  const handlers = new Map<string, Set<WSMessageHandler>>();

  const connect = () => {
    if (!mergedConfig.url) return;
    
    state = 'connecting';
    ws = new WebSocket(mergedConfig.url);
    
    ws.onopen = () => {
      state = 'connected';
      reconnectAttempts = 0;
    };
    
    ws.onclose = () => {
      state = 'disconnected';
      if (mergedConfig.reconnect && reconnectAttempts < mergedConfig.maxReconnectAttempts) {
        reconnectAttempts++;
        setTimeout(connect, mergedConfig.reconnectInterval);
      }
    };
    
    ws.onerror = () => {
      state = 'error';
    };
    
    ws.onmessage = (event) => {
      const message: WSMessage = JSON.parse(event.data);
      const typeHandlers = handlers.get(message.type);
      typeHandlers?.forEach(handler => handler(message));
    };
  };

  const disconnect = () => {
    ws?.close();
    ws = null;
    state = 'disconnected';
  };

  const send = <T>(type: string, payload: T) => {
    if (ws?.readyState === WebSocket.OPEN) {
      const message: WSMessage<T> = { type, payload, timestamp: Date.now() };
      ws.send(JSON.stringify(message));
    }
  };

  const subscribe = <T>(type: string, handler: WSMessageHandler<T>): (() => void) => {
    if (!handlers.has(type)) handlers.set(type, new Set());
    handlers.get(type)!.add(handler as WSMessageHandler);
    return () => handlers.get(type)?.delete(handler as WSMessageHandler);
  };

  const getState = () => state;

  return { connect, disconnect, send, subscribe, getState };
};

export default createWebSocketService;
