import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  formatDuration, getRelativeTime, isToday, isYesterday, isSameDay,
  isBefore, isAfter, isBetween, addDays, diffDays, getDaysInMonth,
  getFirstDayOfMonth, toISO, parseISO,
} from "@/utils/date";

describe("date utils", () => {
  describe("formatDuration", () => {
    it("formats seconds", () => {
      expect(formatDuration(0)).toBe("0s");
      expect(formatDuration(30)).toBe("30s");
      expect(formatDuration(59)).toBe("59s");
    });
    it("formats minutes", () => {
      expect(formatDuration(60)).toBe("1min");
      expect(formatDuration(120)).toBe("2min");
      expect(formatDuration(3599)).toBe("59min");
    });
    it("formats hours", () => {
      expect(formatDuration(3600)).toBe("1h");
      expect(formatDuration(3660)).toBe("1h 1min");
      expect(formatDuration(7200)).toBe("2h");
      expect(formatDuration(7320)).toBe("2h 2min");
    });
  });

  describe("getRelativeTime", () => {
    beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date("2026-03-15T12:00:00Z")); });
    afterEach(() => { vi.useRealTimers(); });

    it("returns 'agora' for recent", () => {
      expect(getRelativeTime(new Date("2026-03-15T11:59:30Z"))).toBe("agora");
    });
    it("returns minutes ago", () => {
      expect(getRelativeTime(new Date("2026-03-15T11:55:00Z"))).toBe("5m atrás");
    });
    it("returns hours ago", () => {
      expect(getRelativeTime(new Date("2026-03-15T09:00:00Z"))).toBe("3h atrás");
    });
    it("returns days ago", () => {
      expect(getRelativeTime(new Date("2026-03-13T12:00:00Z"))).toBe("2d atrás");
    });
    it("returns weeks ago", () => {
      expect(getRelativeTime(new Date("2026-03-01T12:00:00Z"))).toBe("2 semanas atrás");
    });
    it("returns months ago", () => {
      expect(getRelativeTime(new Date("2025-12-15T12:00:00Z"))).toBe("3 mêses atrás");
    });
  });

  describe("isToday / isYesterday", () => {
    it("detects today", () => {
      expect(isToday(new Date())).toBe(true);
      expect(isToday(new Date("2000-01-01"))).toBe(false);
    });
    it("detects yesterday", () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      expect(isYesterday(yesterday)).toBe(true);
      expect(isYesterday(new Date())).toBe(false);
    });
  });

  describe("isSameDay", () => {
    it("compares dates correctly", () => {
      const d1 = new Date("2026-03-15T08:00:00");
      const d2 = new Date("2026-03-15T22:00:00");
      const d3 = new Date("2026-03-16T08:00:00");
      expect(isSameDay(d1, d2)).toBe(true);
      expect(isSameDay(d1, d3)).toBe(false);
    });
  });

  describe("isBefore / isAfter / isBetween", () => {
    const early = new Date("2026-01-01");
    const mid = new Date("2026-06-15");
    const late = new Date("2026-12-31");

    it("compares before/after", () => {
      expect(isBefore(early, late)).toBe(true);
      expect(isBefore(late, early)).toBe(false);
      expect(isAfter(late, early)).toBe(true);
      expect(isAfter(early, late)).toBe(false);
    });
    it("checks between", () => {
      expect(isBetween(mid, early, late)).toBe(true);
      expect(isBetween(early, mid, late)).toBe(false);
    });
  });

  describe("addDays", () => {
    it("adds days correctly", () => {
      const d = new Date("2026-03-15");
      expect(addDays(d, 1).getDate()).toBe(16);
      expect(addDays(d, -1).getDate()).toBe(14);
      expect(addDays(d, 0).getDate()).toBe(15);
    });
    it("handles month boundaries", () => {
      const d = new Date("2026-03-31");
      const result = addDays(d, 1);
      expect(result.getMonth()).toBe(3); // April
      expect(result.getDate()).toBe(1);
    });
  });

  describe("diffDays", () => {
    it("calculates day difference", () => {
      expect(diffDays(new Date("2026-03-01"), new Date("2026-03-15"))).toBe(14);
      expect(diffDays(new Date("2026-03-15"), new Date("2026-03-01"))).toBe(14);
      expect(diffDays(new Date("2026-03-15"), new Date("2026-03-15"))).toBe(0);
    });
  });

  describe("getDaysInMonth", () => {
    it("returns correct days", () => {
      expect(getDaysInMonth(2026, 0)).toBe(31); // January
      expect(getDaysInMonth(2026, 1)).toBe(28); // February (non-leap)
      expect(getDaysInMonth(2024, 1)).toBe(29); // February (leap)
      expect(getDaysInMonth(2026, 3)).toBe(30); // April
    });
  });

  describe("toISO / parseISO", () => {
    it("converts to/from ISO", () => {
      const d = new Date("2026-03-15T12:00:00.000Z");
      expect(toISO(d)).toBe("2026-03-15T12:00:00.000Z");
      expect(parseISO("2026-03-15T12:00:00.000Z").getTime()).toBe(d.getTime());
    });
  });
});
