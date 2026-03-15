import { describe, it, expect } from "vitest";
import { ConnectionPool } from "@/lib/connectionPool";

describe("ConnectionPool", () => {
  it("acquire returns a connection", async () => {
    let id = 0;
    const pool = new ConnectionPool(() => Promise.resolve({ id: ++id }), 3, 0);
    const conn = await pool.acquire();
    expect(conn.id).toBe(1);
  });

  it("release makes connection available again", async () => {
    let id = 0;
    const pool = new ConnectionPool(() => Promise.resolve({ id: ++id }), 2, 0);
    const c1 = await pool.acquire();
    pool.release(c1);
    expect(pool.stats.available).toBeGreaterThanOrEqual(1);
    expect(pool.stats.inUse).toBe(0);
  });

  it("stats tracks available and inUse", async () => {
    let id = 0;
    const pool = new ConnectionPool(() => Promise.resolve({ id: ++id }), 5, 0);
    const c1 = await pool.acquire();
    const c2 = await pool.acquire();
    expect(pool.stats.inUse).toBe(2);
    pool.release(c1);
    expect(pool.stats.inUse).toBe(1);
  });

  it("reuses released connections", async () => {
    let id = 0;
    const pool = new ConnectionPool(() => Promise.resolve({ id: ++id }), 2, 0);
    const c1 = await pool.acquire();
    pool.release(c1);
    const c2 = await pool.acquire();
    expect(c2.id).toBe(c1.id); // same connection reused
  });
});
