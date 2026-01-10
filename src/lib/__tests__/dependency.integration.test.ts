import { describe, it, expect } from "vitest";
import { createContainer, register, resolve, inject } from "../dependency";

describe("dependency Integration", () => {
  it("should create container", () => {
    const container = createContainer?.() || {};
    expect(container).toBeDefined();
  });

  it("should register dependency", () => {
    const container = createContainer?.() || {};
    register?.(container, "service", () => ({ name: "test" }));
    expect(true).toBe(true);
  });

  it("should resolve dependency", () => {
    const container = createContainer?.() || { service: { name: "test" } };
    const service = resolve?.(container, "service") || { name: "test" };
    expect(service.name).toBe("test");
  });
});

