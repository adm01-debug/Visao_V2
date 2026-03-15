import { describe, it, expect, beforeEach } from "vitest";
import { configure, clearCache, getCacheStats, isLanguageSupported, SUPPORTED_LANGUAGES } from "@/services/translationService";

describe("translationService", () => {
  beforeEach(() => clearCache());

  describe("isLanguageSupported", () => {
    it("pt is supported", () => expect(isLanguageSupported("pt")).toBe(true));
    it("en is supported", () => expect(isLanguageSupported("en")).toBe(true));
    it("zh is supported", () => expect(isLanguageSupported("zh")).toBe(true));
    it("xx is not supported", () => expect(isLanguageSupported("xx")).toBe(false));
  });

  describe("SUPPORTED_LANGUAGES", () => {
    it("has at least 15 languages", () => {
      expect(Object.keys(SUPPORTED_LANGUAGES).length).toBeGreaterThanOrEqual(15);
    });
    it("pt maps to Português", () => expect(SUPPORTED_LANGUAGES.pt).toBe("Português"));
    it("en maps to English", () => expect(SUPPORTED_LANGUAGES.en).toBe("English"));
  });

  describe("configure", () => {
    it("does not throw", () => {
      expect(() => configure({ cacheEnabled: false })).not.toThrow();
    });
    it("can change all settings", () => {
      expect(() => configure({
        defaultProvider: "google",
        cacheEnabled: true,
        cacheTTL: 7200,
        maxRetries: 5,
        timeout: 20000,
      })).not.toThrow();
    });
  });

  describe("cache", () => {
    it("clearCache resets cache size to 0", () => {
      clearCache();
      expect(getCacheStats().size).toBe(0);
    });
    it("getCacheStats returns size and hitRate", () => {
      const stats = getCacheStats();
      expect(stats).toHaveProperty("size");
      expect(stats).toHaveProperty("hitRate");
    });
  });
});
