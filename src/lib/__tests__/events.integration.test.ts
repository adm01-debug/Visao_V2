import { describe, it, expect, vi } from "vitest";
import { eventBus, emit, on, off } from "../events";

describe("events Integration", () => {
  it("should emit and listen to events", () => {
    const handler = vi.fn();
    
    on?.("test-event", handler);
    emit?.("test-event", { data: "test" });
    
    expect(handler).toHaveBeenCalledWith({ data: "test" });
  });

  it("should remove event listener", () => {
    const handler = vi.fn();
    
    on?.("test-event", handler);
    off?.("test-event", handler);
    emit?.("test-event", { data: "test" });
    
    expect(handler).not.toHaveBeenCalled();
  });
});

