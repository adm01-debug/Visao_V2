import { describe, it, expect } from "vitest";
import {
  clamp, lerp, inverseLerp, remap, round, floor, ceil,
  sum, average, median, standardDeviation, percentage,
  degToRad, radToDeg, distance, isPowerOfTwo, factorial, gcd, lcm,
} from "@/utils/math";

describe("math utils", () => {
  describe("clamp", () => {
    it("clamps values", () => {
      expect(clamp(5, 0, 10)).toBe(5);
      expect(clamp(-5, 0, 10)).toBe(0);
      expect(clamp(15, 0, 10)).toBe(10);
      expect(clamp(0, 0, 0)).toBe(0);
    });
  });

  describe("lerp / inverseLerp", () => {
    it("interpolates linearly", () => {
      expect(lerp(0, 10, 0.5)).toBe(5);
      expect(lerp(0, 10, 0)).toBe(0);
      expect(lerp(0, 10, 1)).toBe(10);
      expect(lerp(-10, 10, 0.5)).toBe(0);
    });
    it("inverse lerp", () => {
      expect(inverseLerp(0, 10, 5)).toBe(0.5);
      expect(inverseLerp(0, 10, 0)).toBe(0);
      expect(inverseLerp(0, 10, 10)).toBe(1);
    });
  });

  describe("remap", () => {
    it("remaps value between ranges", () => {
      expect(remap(5, 0, 10, 0, 100)).toBe(50);
      expect(remap(0, 0, 10, 100, 200)).toBe(100);
    });
  });

  describe("round / floor / ceil", () => {
    it("rounds with decimals", () => {
      expect(round(3.456, 2)).toBe(3.46);
      expect(round(3.454, 2)).toBe(3.45);
      expect(floor(3.999, 1)).toBe(3.9);
      expect(ceil(3.001, 1)).toBe(3.1);
    });
  });

  describe("statistics", () => {
    it("sum", () => expect(sum([1, 2, 3, 4])).toBe(10));
    it("average", () => expect(average([2, 4, 6])).toBe(4));
    it("average empty", () => expect(average([])).toBe(0));
    it("median odd", () => expect(median([3, 1, 2])).toBe(2));
    it("median even", () => expect(median([1, 2, 3, 4])).toBe(2.5));
    it("stddev", () => {
      const sd = standardDeviation([2, 4, 4, 4, 5, 5, 7, 9]);
      expect(round(sd, 2)).toBe(2);
    });
  });

  describe("percentage", () => {
    it("calculates percentages", () => {
      expect(percentage(25, 100)).toBe(25);
      expect(percentage(1, 3)).toBeCloseTo(33.33, 1);
      expect(percentage(0, 0)).toBe(0);
    });
  });

  describe("trigonometry", () => {
    it("converts degrees/radians", () => {
      expect(round(degToRad(180), 4)).toBe(round(Math.PI, 4));
      expect(round(radToDeg(Math.PI), 4)).toBe(180);
    });
  });

  describe("distance", () => {
    it("calculates 2D distance", () => {
      expect(distance(0, 0, 3, 4)).toBe(5);
      expect(distance(0, 0, 0, 0)).toBe(0);
      expect(round(distance(1, 1, 4, 5), 2)).toBe(5);
    });
  });

  describe("isPowerOfTwo", () => {
    it("checks power of two", () => {
      expect(isPowerOfTwo(1)).toBe(true);
      expect(isPowerOfTwo(2)).toBe(true);
      expect(isPowerOfTwo(4)).toBe(true);
      expect(isPowerOfTwo(1024)).toBe(true);
      expect(isPowerOfTwo(3)).toBe(false);
      expect(isPowerOfTwo(0)).toBe(false);
      expect(isPowerOfTwo(-2)).toBe(false);
    });
  });

  describe("factorial", () => {
    it("calculates factorial", () => {
      expect(factorial(0)).toBe(1);
      expect(factorial(1)).toBe(1);
      expect(factorial(5)).toBe(120);
      expect(factorial(10)).toBe(3628800);
    });
  });

  describe("gcd / lcm", () => {
    it("calculates GCD", () => {
      expect(gcd(12, 8)).toBe(4);
      expect(gcd(7, 3)).toBe(1);
      expect(gcd(100, 75)).toBe(25);
    });
    it("calculates LCM", () => {
      expect(lcm(4, 6)).toBe(12);
      expect(lcm(3, 7)).toBe(21);
    });
  });
});
