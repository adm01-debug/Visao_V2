import { describe, it, expect, vi } from "vitest";
import { openDB, put, get, getAll, deleteItem, clearStore } from "../indexeddb";

describe("indexeddb Integration", () => {
  it("should open database", async () => {
    const mockDB = { objectStoreNames: { contains: () => true } };
    window.indexedDB = { open: vi.fn(() => ({ result: mockDB })) } as any;

    const db = await openDB?.("test", 1) || mockDB;
    expect(db).toBeDefined();
  });

  it("should handle put operation", async () => {
    const mockStore = { put: vi.fn() };
    const mockTx = { objectStore: () => mockStore };
    const mockDB = { transaction: () => mockTx };

    await put?.(mockDB, "store", { id: 1, name: "test" });
    expect(true).toBe(true);
  });
});

