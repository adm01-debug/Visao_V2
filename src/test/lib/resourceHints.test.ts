import { describe, it, expect, afterEach } from "vitest";
import { preload, prefetch, preconnect, dnsPrefetch } from "@/lib/resourceHints";

describe("resourceHints", () => {
  afterEach(() => {
    document.head.querySelectorAll("link[rel]").forEach(el => el.remove());
  });

  it("preload adds link element", () => {
    preload("/script.js", "script");
    const link = document.head.querySelector('link[rel="preload"]') as HTMLLinkElement;
    expect(link).not.toBeNull();
    expect(link.href).toContain("/script.js");
    expect(link.as).toBe("script");
  });

  it("prefetch adds link element", () => {
    prefetch("/page.html");
    const link = document.head.querySelector('link[rel="prefetch"]') as HTMLLinkElement;
    expect(link).not.toBeNull();
    expect(link.href).toContain("/page.html");
  });

  it("preconnect adds link element", () => {
    preconnect("https://api.example.com");
    const link = document.head.querySelector('link[rel="preconnect"]') as HTMLLinkElement;
    expect(link).not.toBeNull();
    expect(link.href).toBe("https://api.example.com/");
  });

  it("dnsPrefetch adds link element", () => {
    dnsPrefetch("https://cdn.example.com");
    const link = document.head.querySelector('link[rel="dns-prefetch"]') as HTMLLinkElement;
    expect(link).not.toBeNull();
  });

  it("multiple hints don't conflict", () => {
    preload("/a.js", "script");
    prefetch("/b.css");
    preconnect("https://c.com");
    expect(document.head.querySelectorAll("link").length).toBeGreaterThanOrEqual(3);
  });
});
