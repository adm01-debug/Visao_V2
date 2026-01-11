/**
 * WebSocket utilities
 */

export interface WebSocketOptions {
  reconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export function createWebSocket(url: string, options?: WebSocketOptions): WebSocket {
  return new WebSocket(url);
}

export function send(ws: WebSocket, data: unknown): void {
  ws.send(JSON.stringify(data));
}

export function onMessage(ws: WebSocket, callback: (data: unknown) => void): void {
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    callback(data);
  };
}

export function onOpen(ws: WebSocket, callback: () => void): void {
  ws.onopen = callback;
}

export function onClose(ws: WebSocket, callback: () => void): void {
  ws.onclose = callback;
}

export function onError(ws: WebSocket, callback: (error: Event) => void): void {
  ws.onerror = callback;
}

export default { createWebSocket, send, onMessage, onOpen, onClose, onError };

