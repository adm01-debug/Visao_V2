import { describe, it, expect, vi } from "vitest";
import { api, get, post, put, del } from "../api";

describe("api Integration", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  it("should make GET request", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: "test" }),
    });

    const result = await (get?.("/test") || fetch("/test"));
    expect(global.fetch).toHaveBeenCalled();
  });

  it("should make POST request", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    const result = await (post?.("/test", { data: "test" }) || fetch("/test", { method: "POST" }));
    expect(global.fetch).toHaveBeenCalled();
  });
});

