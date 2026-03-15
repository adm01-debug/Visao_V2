import { describe, it, expect } from "vitest";
import {
  randomInt, randomFloat, randomBoolean, randomItem, randomItems,
  shuffle, randomString, randomHex, randomAlpha, randomNumeric,
  randomColor, randomRgb, randomHsl, randomDate, weightedRandom,
} from "@/utils/random";

describe("random utils", () => {
  describe("randomInt", () => {
    it("generates within range", () => {
      for (let i = 0; i < 200; i++) {
        const n = randomInt(5, 10);
        expect(n).toBeGreaterThanOrEqual(5);
        expect(n).toBeLessThanOrEqual(10);
        expect(Number.isInteger(n)).toBe(true);
      }
    });
  });

  describe("randomFloat", () => {
    it("generates within range", () => {
      for (let i = 0; i < 200; i++) {
        const n = randomFloat(1.0, 2.0);
        expect(n).toBeGreaterThanOrEqual(1.0);
        expect(n).toBeLessThan(2.0);
      }
    });
  });

  describe("randomBoolean", () => {
    it("generates booleans", () => {
      const results = Array.from({ length: 1000 }, () => randomBoolean());
      expect(results.some(b => b)).toBe(true);
      expect(results.some(b => !b)).toBe(true);
    });
    it("probability 0 = always false", () => {
      for (let i = 0; i < 100; i++) expect(randomBoolean(0)).toBe(false);
    });
    it("probability 1 = always true", () => {
      for (let i = 0; i < 100; i++) expect(randomBoolean(1)).toBe(true);
    });
  });

  describe("randomItem", () => {
    it("picks from array", () => {
      const arr = [1, 2, 3, 4, 5];
      for (let i = 0; i < 100; i++) expect(arr).toContain(randomItem(arr));
    });
  });

  describe("randomItems", () => {
    it("picks multiple unique items", () => {
      const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const items = randomItems(arr, 3);
      expect(items).toHaveLength(3);
      items.forEach(item => expect(arr).toContain(item));
    });
    it("handles count > array length", () => {
      expect(randomItems([1, 2], 5)).toHaveLength(2);
    });
  });

  describe("shuffle", () => {
    it("preserves elements", () => {
      const arr = [1, 2, 3, 4, 5];
      expect(shuffle(arr).sort()).toEqual([1, 2, 3, 4, 5]);
    });
    it("does not mutate", () => {
      const arr = [1, 2, 3];
      shuffle(arr);
      expect(arr).toEqual([1, 2, 3]);
    });
  });

  describe("randomString / randomHex / randomAlpha / randomNumeric", () => {
    it("generates correct length", () => {
      expect(randomString(10)).toHaveLength(10);
      expect(randomHex(8)).toHaveLength(8);
      expect(randomAlpha(5)).toHaveLength(5);
      expect(randomNumeric(6)).toHaveLength(6);
    });
    it("hex is valid hex", () => {
      expect(/^[0-9a-f]+$/.test(randomHex(20))).toBe(true);
    });
    it("alpha is only letters", () => {
      expect(/^[a-zA-Z]+$/.test(randomAlpha(20))).toBe(true);
    });
    it("numeric is only digits", () => {
      expect(/^\d+$/.test(randomNumeric(20))).toBe(true);
    });
  });

  describe("randomColor", () => {
    it("generates hex colors", () => {
      expect(randomColor()).toMatch(/^#[0-9a-f]{6}$/);
    });
  });

  describe("randomRgb / randomHsl", () => {
    it("generates valid RGB", () => {
      const rgb = randomRgb();
      expect(rgb.r).toBeGreaterThanOrEqual(0);
      expect(rgb.r).toBeLessThanOrEqual(255);
    });
    it("generates valid HSL", () => {
      const hsl = randomHsl();
      expect(hsl.h).toBeGreaterThanOrEqual(0);
      expect(hsl.h).toBeLessThanOrEqual(360);
    });
  });

  describe("randomDate", () => {
    it("generates date in range", () => {
      const start = new Date("2020-01-01");
      const end = new Date("2026-12-31");
      for (let i = 0; i < 50; i++) {
        const d = randomDate(start, end);
        expect(d.getTime()).toBeGreaterThanOrEqual(start.getTime());
        expect(d.getTime()).toBeLessThanOrEqual(end.getTime());
      }
    });
  });

  describe("weightedRandom", () => {
    it("respects weights", () => {
      const items = [
        { value: "heavy", weight: 1000 },
        { value: "light", weight: 1 },
      ];
      const results = Array.from({ length: 100 }, () => weightedRandom(items));
      const heavyCount = results.filter(r => r === "heavy").length;
      expect(heavyCount).toBeGreaterThan(80); // statistically almost certain
    });
  });
});
