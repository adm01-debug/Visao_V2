import { describe, it, expect, vi, beforeEach } from "vitest";
import { EventBus, eventBus } from "@/utils/event";

describe("EventBus", () => {
  let bus: InstanceType<typeof EventBus>;
  beforeEach(() => { bus = new EventBus(); });

  it("on/emit: registers and fires", () => {
    const cb = vi.fn();
    bus.on("test", cb);
    bus.emit("test", 1, 2);
    expect(cb).toHaveBeenCalledWith(1, 2);
  });

  it("off: unregisters", () => {
    const cb = vi.fn();
    bus.on("test", cb);
    bus.off("test", cb);
    bus.emit("test");
    expect(cb).not.toHaveBeenCalled();
  });

  it("on returns unsubscribe fn", () => {
    const cb = vi.fn();
    const unsub = bus.on("test", cb);
    unsub();
    bus.emit("test");
    expect(cb).not.toHaveBeenCalled();
  });

  it("once: fires only once", () => {
    const cb = vi.fn();
    bus.once("test", cb);
    bus.emit("test", "a");
    bus.emit("test", "b");
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenCalledWith("a");
  });

  it("multiple listeners on same event", () => {
    const cb1 = vi.fn();
    const cb2 = vi.fn();
    bus.on("ev", cb1);
    bus.on("ev", cb2);
    bus.emit("ev", "data");
    expect(cb1).toHaveBeenCalledWith("data");
    expect(cb2).toHaveBeenCalledWith("data");
  });

  it("clear removes all listeners", () => {
    bus.on("a", vi.fn());
    bus.on("b", vi.fn());
    bus.clear();
    expect(bus.eventNames()).toEqual([]);
  });

  it("listenerCount", () => {
    bus.on("ev", vi.fn());
    bus.on("ev", vi.fn());
    expect(bus.listenerCount("ev")).toBe(2);
    expect(bus.listenerCount("none")).toBe(0);
  });

  it("eventNames", () => {
    bus.on("alpha", vi.fn());
    bus.on("beta", vi.fn());
    expect(bus.eventNames().sort()).toEqual(["alpha", "beta"]);
  });

  it("emit with no listeners does not throw", () => {
    expect(() => bus.emit("nonexistent")).not.toThrow();
  });

  it("off with nonexistent listener does not throw", () => {
    expect(() => bus.off("nonexistent", vi.fn())).not.toThrow();
  });

  it("singleton eventBus exists", () => {
    expect(eventBus).toBeDefined();
    expect(typeof eventBus.on).toBe("function");
  });
});
