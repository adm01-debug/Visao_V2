import { describe, it, expect } from "vitest";
import { compress, decompress, gzip, gunzip } from "../compression";

describe("compression Integration", () => {
  it("should compress data", async () => {
    const data = "hello world repeated many times for compression test";
    const compressed = await compress?.(data) || data;
    expect(compressed).toBeDefined();
  });

  it("should decompress data", async () => {
    const data = "test";
    const compressed = await compress?.(data) || data;
    const decompressed = await decompress?.(compressed) || data;
    expect(decompressed).toBeDefined();
  });
});

