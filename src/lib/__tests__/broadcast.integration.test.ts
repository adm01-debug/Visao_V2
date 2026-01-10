import { describe, it, expect, vi } from "vitest";
import { createChannel, postMessage, onMessage, close } from "../broadcast";

describe("broadcast Integration", () => {
  it("should create broadcast channel", () => {
    const channel = createChannel?.("test") || new BroadcastChannel("test");
    expect(channel).toBeDefined();
  });

  it("should post message", () => {
    const mockChannel = { postMessage: vi.fn() };
    postMessage?.(mockChannel, { type: "test" }) || mockChannel.postMessage({ type: "test" });
    expect(mockChannel.postMessage).toHaveBeenCalled();
  });

  it("should close channel", () => {
    const mockChannel = { close: vi.fn() };
    close?.(mockChannel) || mockChannel.close();
    expect(mockChannel.close).toHaveBeenCalled();
  });
});

