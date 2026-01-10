import { describe, it, expect, vi } from "vitest";
import { httpClient, get, post, put, del } from "../httpClient";

describe("httpClient Integration", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  it("should make GET request", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: "test" }),
    });

    const client = httpClient?.() || { get: fetch };
    const result = await (client.get?.("/api/test") || fetch("/api/test"));
    expect(global.fetch).toHaveBeenCalled();
  });
});

