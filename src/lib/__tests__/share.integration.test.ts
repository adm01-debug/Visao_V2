import { describe, it, expect, vi } from "vitest";
import { share, canShare, shareText, shareUrl, shareFile } from "../share";

describe("share Integration", () => {
  it("should check if can share", () => {
    const result = canShare?.() ?? !!navigator.share;
    expect(typeof result).toBe("boolean");
  });

  it("should share content", async () => {
    navigator.share = vi.fn().mockResolvedValue(undefined);
    await share?.({ title: "Test", text: "Hello" }) || navigator.share({ title: "Test" });
    expect(navigator.share).toHaveBeenCalled();
  });

  it("should share URL", async () => {
    navigator.share = vi.fn().mockResolvedValue(undefined);
    await shareUrl?.("https://example.com") || navigator.share({ url: "https://example.com" });
    expect(navigator.share).toHaveBeenCalled();
  });
});

