import { describe, it, expect } from "vitest";
import { Pool } from "@/utils/pool";

describe("Pool", () => {
  it("creates resources via factory", async () => {
    let count = 0;
    const pool = new Pool(() => ++count, 5);
    const r = await pool.acquire();
    expect(r).toBe(1);
  });

  it("reuses released resources", async () => {
    let count = 0;
    const pool = new Pool(() => ++count, 5);
    const r1 = await pool.acquire();
    pool.release(r1);
    const r2 = await pool.acquire();
    expect(r2).toBe(r1); // reused
    expect(count).toBe(1); // factory called only once
  });

  it("tracks size", async () => {
    let count = 0;
    const pool = new Pool(() => ++count, 5);
    await pool.acquire();
    await pool.acquire();
    expect(pool.size).toBe(2);
  });

  it("supports async factory", async () => {
    const pool = new Pool(async () => "resource", 5);
    const r = await pool.acquire();
    expect(r).toBe("resource");
  });
});
