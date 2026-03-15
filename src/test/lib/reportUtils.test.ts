import { describe, it, expect } from "vitest";
import { formatReportPeriod, calculateGrowth, aggregateByDay, aggregateByHour, getTopN } from "@/lib/reportUtils";

describe("reportUtils", () => {
  describe("formatReportPeriod", () => {
    it("formats date range", () => {
      const result = formatReportPeriod(new Date("2026-01-01"), new Date("2026-01-31"));
      expect(result).toContain("01/01/2026");
      expect(result).toContain("31/01/2026");
      expect(result).toContain(" - ");
    });
  });

  describe("calculateGrowth", () => {
    it("100% growth from 0", () => { expect(calculateGrowth(50, 0)).toBe(100); });
    it("0% when both 0", () => { expect(calculateGrowth(0, 0)).toBe(0); });
    it("50% growth", () => { expect(calculateGrowth(150, 100)).toBe(50); });
    it("negative growth", () => { expect(calculateGrowth(50, 100)).toBe(-50); });
    it("100% growth doubling", () => { expect(calculateGrowth(200, 100)).toBe(100); });
    it("no change", () => { expect(calculateGrowth(100, 100)).toBe(0); });
  });

  describe("aggregateByDay", () => {
    it("groups items by date", () => {
      const items = [
        { timestamp: new Date("2026-01-01T10:00:00"), value: 1 },
        { timestamp: new Date("2026-01-01T15:00:00"), value: 2 },
        { timestamp: new Date("2026-01-02T10:00:00"), value: 3 },
      ];
      const map = aggregateByDay(items);
      expect(map.size).toBe(2);
      expect(map.get("2026-01-01")).toHaveLength(2);
      expect(map.get("2026-01-02")).toHaveLength(1);
    });
    it("empty array", () => { expect(aggregateByDay([]).size).toBe(0); });
  });

  describe("aggregateByHour", () => {
    it("groups items by hour", () => {
      const items = [
        { timestamp: new Date("2026-01-01T10:00:00") },
        { timestamp: new Date("2026-01-01T10:30:00") },
        { timestamp: new Date("2026-01-01T14:00:00") },
      ];
      const map = aggregateByHour(items);
      expect(map.size).toBe(24); // all hours initialized
      expect(map.get(10)).toHaveLength(2);
      expect(map.get(14)).toHaveLength(1);
      expect(map.get(0)).toHaveLength(0);
    });
  });

  describe("getTopN", () => {
    it("gets top 2 by value", () => {
      const items = [{ v: 10 }, { v: 30 }, { v: 20 }, { v: 50 }];
      const top = getTopN(items, 2, i => i.v);
      expect(top).toEqual([{ v: 50 }, { v: 30 }]);
    });
    it("handles n > items", () => {
      const items = [{ v: 1 }];
      expect(getTopN(items, 5, i => i.v)).toHaveLength(1);
    });
    it("handles empty", () => { expect(getTopN([], 3, () => 0)).toHaveLength(0); });
  });
});
