import { describe, it, expect } from "vitest";
import {
  isNumber, isInteger, isPositive, isNegative, isZero, isEven, isOdd,
  toNumber, parseNumber, formatCompact, formatOrdinal, padZero,
  randomInt, randomFloat, inRange, toPercentage, fromPercentage, abbreviate,
} from "@/utils/number";

describe("number utils", () => {
  describe("type checks", () => {
    it("isNumber", () => {
      expect(isNumber(42)).toBe(true);
      expect(isNumber(3.14)).toBe(true);
      expect(isNumber(NaN)).toBe(false);
      expect(isNumber("42")).toBe(false);
      expect(isNumber(null)).toBe(false);
      expect(isNumber(undefined)).toBe(false);
      expect(isNumber(Infinity)).toBe(true);
    });
    it("isInteger", () => {
      expect(isInteger(42)).toBe(true);
      expect(isInteger(3.14)).toBe(false);
      expect(isInteger(0)).toBe(true);
    });
    it("sign checks", () => {
      expect(isPositive(1)).toBe(true);
      expect(isPositive(0)).toBe(false);
      expect(isNegative(-1)).toBe(true);
      expect(isZero(0)).toBe(true);
    });
    it("parity", () => {
      expect(isEven(4)).toBe(true);
      expect(isEven(3)).toBe(false);
      expect(isOdd(3)).toBe(true);
      expect(isOdd(4)).toBe(false);
    });
  });

  describe("toNumber", () => {
    it("converts values", () => {
      expect(toNumber("42")).toBe(42);
      expect(toNumber("abc")).toBe(0);
      expect(toNumber("abc", -1)).toBe(-1);
      expect(toNumber(null)).toBe(0);
      expect(toNumber(true)).toBe(1);
    });
  });

  describe("parseNumber", () => {
    it("parses numeric strings", () => {
      expect(parseNumber("R$ 1.234,56")).toBe(1234.56);
      expect(parseNumber("abc")).toBeNull();
      expect(parseNumber("-42")).toBe(-42);
    });
  });

  describe("padZero", () => {
    it("pads numbers", () => {
      expect(padZero(5, 3)).toBe("005");
      expect(padZero(42, 2)).toBe("42");
      expect(padZero(100, 2)).toBe("100");
    });
  });

  describe("randomInt / randomFloat", () => {
    it("generates within range", () => {
      for (let i = 0; i < 100; i++) {
        const ri = randomInt(1, 10);
        expect(ri).toBeGreaterThanOrEqual(1);
        expect(ri).toBeLessThanOrEqual(10);
        expect(Number.isInteger(ri)).toBe(true);

        const rf = randomFloat(0, 1);
        expect(rf).toBeGreaterThanOrEqual(0);
        expect(rf).toBeLessThan(1);
      }
    });
  });

  describe("inRange", () => {
    it("checks ranges", () => {
      expect(inRange(5, 1, 10)).toBe(true);
      expect(inRange(0, 1, 10)).toBe(false);
      expect(inRange(1, 1, 10)).toBe(true);
      expect(inRange(10, 1, 10)).toBe(true);
    });
  });

  describe("toPercentage / fromPercentage", () => {
    it("converts percentage", () => {
      expect(toPercentage(0.5)).toBe("50%");
      expect(toPercentage(0.123, 1)).toBe("12.3%");
      expect(fromPercentage("50%")).toBe(0.5);
    });
  });

  describe("abbreviate", () => {
    it("abbreviates large numbers", () => {
      expect(abbreviate(999)).toBe("999");
      expect(abbreviate(1000)).toBe("1K");
      expect(abbreviate(1500)).toBe("1.5K");
      expect(abbreviate(1000000)).toBe("1M");
      expect(abbreviate(1500000000)).toBe("1.5B");
    });
  });

  describe("formatOrdinal", () => {
    it("formats pt-BR ordinals", () => {
      expect(formatOrdinal(1)).toBe("1º");
      expect(formatOrdinal(42)).toBe("42º");
    });
  });
});
