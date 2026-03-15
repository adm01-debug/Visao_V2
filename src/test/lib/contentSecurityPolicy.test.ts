import { describe, it, expect } from "vitest";
import { buildCSP, getCSPMeta, applyCSP, CSP_PRESETS } from "@/lib/contentSecurityPolicy";

describe("contentSecurityPolicy", () => {
  describe("buildCSP", () => {
    it("builds default CSP string", () => {
      const csp = buildCSP();
      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain("object-src 'none'");
      expect(csp).toContain("upgrade-insecure-requests");
    });

    it("merges custom directives", () => {
      const csp = buildCSP({ "script-src": ["'self'", "https://cdn.example.com"] });
      expect(csp).toContain("script-src 'self' https://cdn.example.com");
    });

    it("handles boolean false (excludes directive)", () => {
      const csp = buildCSP({ "upgrade-insecure-requests": false });
      expect(csp).not.toContain("upgrade-insecure-requests");
    });

    it("handles empty arrays (excludes directive)", () => {
      const csp = buildCSP({ "font-src": [] });
      expect(csp).not.toContain("font-src");
    });
  });

  describe("getCSPMeta", () => {
    it("returns meta tag", () => {
      const meta = getCSPMeta();
      expect(meta).toContain('<meta http-equiv="Content-Security-Policy"');
      expect(meta).toContain("default-src");
    });
  });

  describe("applyCSP", () => {
    it("adds meta tag to document head", () => {
      applyCSP();
      const meta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
      expect(meta).not.toBeNull();
      expect(meta?.getAttribute("content")).toContain("default-src");
    });

    it("replaces existing CSP meta", () => {
      applyCSP();
      applyCSP({ "default-src": ["'none'"] });
      const metas = document.querySelectorAll('meta[http-equiv="Content-Security-Policy"]');
      expect(metas.length).toBe(1);
    });
  });

  describe("CSP_PRESETS", () => {
    it("strict preset has no unsafe-inline", () => {
      const csp = buildCSP(CSP_PRESETS.strict);
      expect(csp).not.toContain("unsafe-inline");
    });

    it("relaxed preset allows unsafe-eval", () => {
      const csp = buildCSP(CSP_PRESETS.relaxed);
      expect(csp).toContain("unsafe-eval");
    });

    it("videoStreaming preset includes media-src", () => {
      const csp = buildCSP(CSP_PRESETS.videoStreaming);
      expect(csp).toContain("media-src");
      expect(csp).toContain("blob:");
    });
  });

  // SECURITY GAP: default CSP includes 'unsafe-inline' for scripts
  it("SECURITY GAP: default CSP allows unsafe-inline scripts", () => {
    const csp = buildCSP();
    expect(csp).toContain("script-src 'self' 'unsafe-inline'");
    // This weakens CSP against XSS — should use nonces or hashes in production
  });
});
