import { useEffect, useRef, useState, useCallback } from 'react';

interface WebSocketOptions {
  onMessage?: (data: unknown) => void;
  onError?: (error: Event) => void;
  reconnect?: boolean;
  reconnectInterval?: number;
}

export const useWebSocket = (url: string, options: WebSocketOptions = {}) => {
  const { onMessage, onError, reconnect = true, reconnectInterval = 5000 } = options;
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  const connect = useCallback(() => {
    wsRef.current = new WebSocket(url);
    wsRef.current.onopen = () => setIsConnected(true);
    wsRef.current.onclose = () => {
      setIsConnected(false);
      if (reconnect) setTimeout(connect, reconnectInterval);
    };
    wsRef.current.onmessage = (e) => onMessage?.(JSON.parse(e.data));
    wsRef.current.onerror = (e) => onError?.(e);
  }, [url, onMessage, onError, reconnect, reconnectInterval]);

  useEffect(() => {
    connect();
    return () => wsRef.current?.close();
  }, [connect]);

  const send = useCallback((data: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  return { isConnected, send };
};
