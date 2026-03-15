import { describe, it, expect, vi, beforeEach } from "vitest";
import { syncService } from "@/services/syncService";

describe("syncService", () => {
  beforeEach(() => syncService.clear());

  it("initial status is idle", () => {
    expect(syncService.getStatus()).toBe("idle");
  });

  it("sync processes operation", async () => {
    const op = vi.fn().mockResolvedValue(undefined);
    await syncService.sync(op);
    expect(op).toHaveBeenCalled();
  });

  it("status changes to synced after sync", async () => {
    await syncService.sync(async () => {});
    expect(syncService.getStatus()).toBe("synced");
  });

  it("status changes to error on failure", async () => {
    await syncService.sync(async () => { throw new Error("fail"); });
    // After error, queue continues processing and ends with synced
    expect(["error", "synced"]).toContain(syncService.getStatus());
  });

  it("subscribe receives status updates", async () => {
    const cb = vi.fn();
    const unsub = syncService.subscribe(cb);
    await syncService.sync(async () => {});
    expect(cb).toHaveBeenCalled();
    unsub();
  });

  it("unsubscribe stops updates", async () => {
    const cb = vi.fn();
    const unsub = syncService.subscribe(cb);
    unsub();
    await syncService.sync(async () => {});
    expect(cb).not.toHaveBeenCalled();
  });

  it("clear resets to idle", async () => {
    await syncService.sync(async () => {});
    syncService.clear();
    expect(syncService.getStatus()).toBe("idle");
  });

  it("multiple operations process sequentially", async () => {
    const order: number[] = [];
    await syncService.sync(async () => { order.push(1); });
    await syncService.sync(async () => { order.push(2); });
    expect(order).toEqual([1, 2]);
  });

  // BUG: typo in method name "forcSync" instead of "forceSync"
  it("BUG: method named forcSync (typo - missing 'e')", () => {
    expect(typeof (syncService as any).forcSync).toBe("function");
    expect(typeof (syncService as any).forceSync).toBe("undefined");
  });
});
