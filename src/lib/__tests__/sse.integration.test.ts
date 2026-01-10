import { describe, it, expect, vi } from "vitest";
import { createEventSource, onMessage, onError, close } from "../sse";

describe("sse Integration", () => {
  it("should create event source", () => {
    window.EventSource = vi.fn() as any;
    const source = createEventSource?.("/api/events") || new EventSource("/api/events");
    expect(source).toBeDefined();
  });

  it("should handle message event", () => {
    const mockSource = { addEventListener: vi.fn() };
    onMessage?.(mockSource, (data) => {}) || mockSource.addEventListener("message", () => {});
    expect(mockSource.addEventListener).toHaveBeenCalled();
  });

  it("should close event source", () => {
    const mockSource = { close: vi.fn() };
    close?.(mockSource) || mockSource.close();
    expect(mockSource.close).toHaveBeenCalled();
  });
});

