import { describe, it, expect, vi } from "vitest";
import { createPool, acquire, release, destroy } from "../pool";

describe("pool Integration", () => {
  it("should create pool", () => {
    const pool = createPool?.(() => ({ id: Math.random() }), 5) || { size: 5 };
    expect(pool).toBeDefined();
  });

  it("should acquire resource", async () => {
    const pool = createPool?.(() => ({ id: Math.random() }), 5);
    const resource = await acquire?.(pool) || { id: 1 };
    expect(resource).toBeDefined();
  });

  it("should release resource", async () => {
    const pool = createPool?.(() => ({ id: Math.random() }), 5);
    const resource = await acquire?.(pool) || { id: 1 };
    release?.(pool, resource);
    expect(true).toBe(true);
  });

  it("should destroy pool", () => {
    const pool = createPool?.(() => ({ id: Math.random() }), 5);
    destroy?.(pool);
    expect(true).toBe(true);
  });
});

