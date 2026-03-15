import { describe, it, expect } from "vitest";
import { isWithinSchedule, formatSchedule, createWeekdaySchedule, createWeekendSchedule, create24x7Schedule, type TimeSlot } from "@/lib/scheduleUtils";

describe("scheduleUtils", () => {
  describe("createWeekdaySchedule", () => {
    it("creates Mon-Fri schedule", () => {
      const s = createWeekdaySchedule("08:00", "17:00");
      expect(s.days).toEqual([1, 2, 3, 4, 5]);
      expect(s.start).toBe("08:00");
      expect(s.end).toBe("17:00");
    });
  });

  describe("createWeekendSchedule", () => {
    it("creates Sat-Sun schedule", () => {
      const s = createWeekendSchedule("10:00", "16:00");
      expect(s.days).toEqual([0, 6]);
    });
  });

  describe("create24x7Schedule", () => {
    it("covers all days and full time", () => {
      const s = create24x7Schedule();
      expect(s.days).toHaveLength(7);
      expect(s.start).toBe("00:00");
      expect(s.end).toBe("23:59");
    });
  });

  describe("isWithinSchedule", () => {
    it("true for 24x7 schedule", () => {
      expect(isWithinSchedule([create24x7Schedule()])).toBe(true);
    });
    it("checks specific date/time", () => {
      // Monday 10:00
      const monday10 = new Date("2026-03-16T10:00:00");
      const weekday = createWeekdaySchedule("08:00", "17:00");
      expect(isWithinSchedule([weekday], monday10)).toBe(true);
    });
    it("false outside schedule", () => {
      // Sunday
      const sunday = new Date("2026-03-15T10:00:00");
      const weekday = createWeekdaySchedule("08:00", "17:00");
      expect(isWithinSchedule([weekday], sunday)).toBe(false);
    });
    it("false outside time range", () => {
      const monday23 = new Date("2026-03-16T23:00:00");
      const weekday = createWeekdaySchedule("08:00", "17:00");
      expect(isWithinSchedule([weekday], monday23)).toBe(false);
    });
  });

  describe("formatSchedule", () => {
    it("formats weekday schedule", () => {
      const result = formatSchedule(createWeekdaySchedule("08:00", "17:00"));
      expect(result).toBe("Seg, Ter, Qua, Qui, Sex 08:00-17:00");
    });
    it("formats weekend schedule", () => {
      const result = formatSchedule(createWeekendSchedule("10:00", "16:00"));
      expect(result).toBe("Dom, Sáb 10:00-16:00");
    });
  });
});
