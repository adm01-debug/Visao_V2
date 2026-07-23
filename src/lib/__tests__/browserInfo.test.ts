import { describe, expect, it } from "vitest";
import { detectBrowser, resolutionBucket } from "@/lib/browserInfo";

describe("browserInfo", () => {
  describe("detectBrowser", () => {
    it("detecta Chrome no Windows", () => {
      const info = detectBrowser(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
      );
      expect(info.browser).toBe("Chrome");
      expect(info.os).toBe("Windows");
      expect(info.browserVersion).toMatch(/^120/);
    });

    it("detecta Firefox no Linux", () => {
      const info = detectBrowser(
        "Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0",
      );
      expect(info.browser).toBe("Firefox");
      expect(info.os).toBe("Linux");
    });

    it("detecta Safari no macOS", () => {
      const info = detectBrowser(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17.0 Safari/605.1.15",
      );
      expect(info.browser).toBe("Safari");
      expect(info.os).toBe("macOS");
    });

    it("detecta Edge antes de cair em Chrome", () => {
      const info = detectBrowser(
        "Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0",
      );
      expect(info.browser).toBe("Edge");
    });

    it("retorna Unknown em UA vazio sem crashar", () => {
      const info = detectBrowser("");
      expect(info.browser).toBe("Unknown");
      expect(info.os).toBe("Unknown");
    });
  });

  describe("resolutionBucket", () => {
    it.each([
      [3840, 2160, "2160p"],
      [2560, 1440, "1440p"],
      [1920, 1080, "1080p"],
      [1280, 720, "720p"],
      [854, 480, "480p"],
      [640, 360, "other"],
    ])("largura %d x altura %d → %s", (w, h, expected) => {
      expect(resolutionBucket(w, h)).toBe(expected);
    });

    it("aceita null/undefined", () => {
      expect(resolutionBucket(null, null)).toBe("other");
      expect(resolutionBucket(undefined, undefined)).toBe("other");
    });

    it("aceita 0 sem erro", () => {
      expect(resolutionBucket(0, 0)).toBe("other");
    });
  });
});
