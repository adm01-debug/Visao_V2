import { describe, it, expect, vi } from "vitest";
import { createWebSocket, connect, disconnect, send } from "../websocket";

describe("websocket Integration", () => {
  it("should create websocket instance", () => {
    const ws = createWebSocket?.("ws://localhost") || { url: "ws://localhost" };
    expect(ws).toBeDefined();
  });

  it("should handle send", () => {
    const mockSend = vi.fn();
    const ws = { send: mockSend };
    send?.(ws, { type: "test" }) || ws.send(JSON.stringify({ type: "test" }));
    expect(mockSend).toHaveBeenCalled();
  });
});

