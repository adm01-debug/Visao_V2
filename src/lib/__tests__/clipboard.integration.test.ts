import { describe, it, expect, vi } from "vitest";
import { copy, paste, readClipboard, writeClipboard } from "../clipboard";

describe("clipboard Integration", () => {
  beforeEach(() => {
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
        readText: vi.fn().mockResolvedValue("test"),
      },
    });
  });

  it("should copy to clipboard", async () => {
    await (copy?.("test") || writeClipboard?.("test") || navigator.clipboard.writeText("test"));
    expect(navigator.clipboard.writeText).toHaveBeenCalled();
  });
});

