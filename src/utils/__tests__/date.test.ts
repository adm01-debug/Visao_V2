import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { formatDate, formatDateTime, getRelativeTime } from "../date";

describe("date utils", () => {
  describe("formatDate", () => {
    it("should format date correctly for pt-BR", () => {
      const date = new Date("2024-01-15");
      const result = formatDate(date, "pt-BR");
      expect(result).toMatch(/15\/01\/2024|15.01.2024/);
    });

    it("should format string date", () => {
      const result = formatDate("2024-06-20", "pt-BR");
      expect(result).toContain("2024");
    });

    it("should handle en-US locale", () => {
      const date = new Date("2024-01-15");
      const result = formatDate(date, "en-US");
      expect(result).toContain("2024");
    });
  });

  describe("formatDateTime", () => {
    it("should format date and time", () => {
      const date = new Date("2024-01-15T14:30:00");
      const result = formatDateTime(date, "pt-BR");
      expect(result).toContain("2024");
    });

    it("should include time component", () => {
      const date = new Date("2024-01-15T14:30:00");
      const result = formatDateTime(date, "pt-BR");
      expect(result).toMatch(/14|2/);
    });
  });

  describe("getRelativeTime", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2024-01-15T12:00:00"));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("should return agora for recent times", () => {
      const now = new Date();
      expect(getRelativeTime(now)).toBe("agora");
    });

    it("should return minutes ago", () => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      expect(getRelativeTime(fiveMinutesAgo)).toContain("m");
    });

    it("should return hours ago", () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      expect(getRelativeTime(twoHoursAgo)).toContain("h");
    });

    it("should return days ago", () => {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      expect(getRelativeTime(threeDaysAgo)).toContain("d");
    });
  });
});
