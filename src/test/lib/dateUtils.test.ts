import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { formatDate, formatDateTime, formatTime, formatRelativeTime, formatDuration, isToday } from "@/lib/dateUtils";

describe("lib/dateUtils", () => {
  describe("formatDate", () => {
    it("formats valid dates", () => {
      const result = formatDate("2026-03-15");
      expect(result).toBeTruthy();
      expect(result).toContain("15");
    });
    it("returns empty for invalid dates", () => {
      expect(formatDate("invalid")).toBe("");
      expect(formatDate("")).toBe("");
    });
    it("accepts Date objects", () => {
      expect(formatDate(new Date("2026-01-01"))).toBeTruthy();
    });
  });

  describe("formatDateTime", () => {
    it("formats date and time", () => {
      const result = formatDateTime("2026-03-15T14:30:00");
      expect(result).toBeTruthy();
    });
    it("returns empty for invalid", () => {
      expect(formatDateTime("garbage")).toBe("");
    });
  });

  describe("formatTime", () => {
    it("formats time portion", () => {
      const result = formatTime("2026-03-15T14:30:00");
      expect(result).toBeTruthy();
    });
    it("returns empty for invalid", () => {
      expect(formatTime("nope")).toBe("");
    });
  });

  describe("formatRelativeTime", () => {
    beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date("2026-03-15T12:00:00Z")); });
    afterEach(() => { vi.useRealTimers(); });

    it("returns 'agora' for < 60s", () => {
      expect(formatRelativeTime("2026-03-15T11:59:30Z")).toBe("agora");
    });
    it("returns minutes", () => {
      expect(formatRelativeTime("2026-03-15T11:50:00Z")).toBe("10m atrás");
    });
    it("returns hours", () => {
      expect(formatRelativeTime("2026-03-15T09:00:00Z")).toBe("3h atrás");
    });
    it("returns days", () => {
      expect(formatRelativeTime("2026-03-13T12:00:00Z")).toBe("2d atrás");
    });
    it("falls back to formatDate for > 30d", () => {
      const result = formatRelativeTime("2025-01-01T00:00:00Z");
      expect(result).toBeTruthy();
      expect(result).not.toContain("atrás");
    });
  });

  describe("formatDuration", () => {
    it("formats seconds only", () => {
      expect(formatDuration(45)).toBe("45s");
      expect(formatDuration(0)).toBe("0s");
    });
    it("formats minutes and seconds", () => {
      expect(formatDuration(125)).toBe("2m 5s");
      expect(formatDuration(60)).toBe("1m 0s");
    });
    it("formats hours, minutes, seconds", () => {
      expect(formatDuration(3661)).toBe("1h 1m 1s");
      expect(formatDuration(7200)).toBe("2h 0m 0s");
    });
  });

  describe("isToday", () => {
    it("identifies today", () => {
      expect(isToday(new Date())).toBe(true);
      expect(isToday(new Date().toISOString())).toBe(true);
    });
    it("rejects other days", () => {
      expect(isToday("2000-01-01")).toBe(false);
    });
  });
});
