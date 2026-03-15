import { describe, it, expect, vi } from "vitest";
import { copy, paste, copyToClipboard, readFromClipboard } from "@/utils/clipboard";

describe("clipboard", () => {
  it("copy returns false when clipboard API fails", async () => {
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: vi.fn().mockRejectedValue(new Error("denied")) },
      writable: true, configurable: true,
    });
    expect(await copy("test")).toBe(false);
  });

  it("copy returns true when clipboard API succeeds", async () => {
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      writable: true, configurable: true,
    });
    expect(await copy("test")).toBe(true);
  });

  it("paste returns empty string on failure", async () => {
    Object.defineProperty(navigator, "clipboard", {
      value: { readText: vi.fn().mockRejectedValue(new Error("denied")) },
      writable: true, configurable: true,
    });
    expect(await paste()).toBe("");
  });

  it("paste returns text on success", async () => {
    Object.defineProperty(navigator, "clipboard", {
      value: { readText: vi.fn().mockResolvedValue("pasted text") },
      writable: true, configurable: true,
    });
    expect(await paste()).toBe("pasted text");
  });

  it("copyToClipboard is alias for copy", async () => {
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      writable: true, configurable: true,
    });
    expect(await copyToClipboard("test")).toBe(true);
  });

  it("readFromClipboard is alias for paste", async () => {
    Object.defineProperty(navigator, "clipboard", {
      value: { readText: vi.fn().mockResolvedValue("data") },
      writable: true, configurable: true,
    });
    expect(await readFromClipboard()).toBe("data");
  });
});
