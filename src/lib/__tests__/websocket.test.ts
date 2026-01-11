import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createWebSocket, WebSocketClient } from '../websocket';

describe('websocket utilities', () => {
  let mockWebSocket: any;

  beforeEach(() => {
    mockWebSocket = {
      send: vi.fn(),
      close: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      readyState: 1,
    };
    vi.spyOn(global, 'WebSocket').mockImplementation(() => mockWebSocket);
  });

  describe('createWebSocket', () => {
    it('creates websocket connection', () => {
      const ws = createWebSocket('wss://test.com');
      expect(ws).toBeDefined();
    });
  });

  describe('WebSocketClient', () => {
    it('connects to server', () => {
      const client = new WebSocketClient('wss://test.com');
      expect(client).toBeDefined();
    });

    it('sends messages', () => {
      const client = new WebSocketClient('wss://test.com');
      client.send({ type: 'test' });
      expect(mockWebSocket.send).toHaveBeenCalled();
    });

    it('closes connection', () => {
      const client = new WebSocketClient('wss://test.com');
      client.close();
      expect(mockWebSocket.close).toHaveBeenCalled();
    });
  });
});
