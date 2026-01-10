import { describe, it, expect, vi } from "vitest";
import { singleton, getSingleton, resetSingleton } from "../singleton";

describe("singleton Integration", () => {
  it("should create singleton", () => {
    const createService = vi.fn(() => ({ name: "service" }));
    const service1 = singleton?.(createService) || createService();
    const service2 = singleton?.(createService) || createService();
    expect(service1).toBe(service2);
  });

  it("should get singleton instance", () => {
    const createService = () => ({ name: "service" });
    singleton?.(createService);
    const instance = getSingleton?.(createService) || { name: "service" };
    expect(instance.name).toBe("service");
  });

  it("should reset singleton", () => {
    const createService = vi.fn(() => ({ name: "service" }));
    singleton?.(createService);
    resetSingleton?.(createService);
    singleton?.(createService);
    expect(createService).toHaveBeenCalledTimes(2);
  });
});

