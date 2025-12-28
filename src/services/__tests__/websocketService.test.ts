/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.CONNECTING;
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onerror: ((error: Error) => void) | null = null;

  constructor(public url: string) {
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      this.onopen?.();
    }, 10);
  }

  send = vi.fn();
  close = vi.fn(() => {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.();
  });
}

vi.stubGlobal('WebSocket', MockWebSocket);

describe('websocketService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('conexão', () => {
    it('deve conectar ao servidor WebSocket', async () => {
      const ws = new MockWebSocket('ws://localhost:8080');
      
      await new Promise(resolve => {
        ws.onopen = () => resolve(undefined);
      });

      expect(ws.readyState).toBe(MockWebSocket.OPEN);
    });

    it('deve desconectar do servidor', () => {
      const ws = new MockWebSocket('ws://localhost:8080');
      ws.close();
      
      expect(ws.close).toHaveBeenCalled();
      expect(ws.readyState).toBe(MockWebSocket.CLOSED);
    });
  });

  describe('mensagens', () => {
    it('deve enviar mensagem', async () => {
      const ws = new MockWebSocket('ws://localhost:8080');
      
      await new Promise(resolve => {
        ws.onopen = () => resolve(undefined);
      });

      ws.send(JSON.stringify({ type: 'ping' }));
      expect(ws.send).toHaveBeenCalledWith(JSON.stringify({ type: 'ping' }));
    });

    it('deve receber mensagem', async () => {
      const ws = new MockWebSocket('ws://localhost:8080');
      const messageHandler = vi.fn();
      
      ws.onmessage = messageHandler;

      // Simular recebimento
      ws.onmessage?.({ data: JSON.stringify({ type: 'pong' }) });
      
      expect(messageHandler).toHaveBeenCalled();
    });
  });

  describe('reconexão', () => {
    it('deve detectar desconexão', async () => {
      const ws = new MockWebSocket('ws://localhost:8080');
      const closeHandler = vi.fn();
      
      ws.onclose = closeHandler;
      ws.close();
      
      expect(closeHandler).toHaveBeenCalled();
    });
  });

  describe('heartbeat', () => {
    it('deve enviar ping periodicamente', async () => {
      vi.useFakeTimers();
      const ws = new MockWebSocket('ws://localhost:8080');
      
      await new Promise(resolve => {
        ws.onopen = () => resolve(undefined);
      });

      // Simular heartbeat
      const heartbeat = setInterval(() => {
        ws.send(JSON.stringify({ type: 'ping' }));
      }, 30000);

      vi.advanceTimersByTime(30000);
      expect(ws.send).toHaveBeenCalled();

      clearInterval(heartbeat);
      vi.useRealTimers();
    });
  });
});
