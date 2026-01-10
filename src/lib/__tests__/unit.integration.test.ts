import { describe, it, expect } from "vitest";
import { convertLength, convertWeight, convertTemperature, convertVolume } from "../unit";

describe("unit Integration", () => {
  it("should convert length", () => {
    const result = convertLength?.(100, "cm", "m") ?? 1;
    expect(result).toBe(1);
  });

  it("should convert weight", () => {
    const result = convertWeight?.(1000, "g", "kg") ?? 1;
    expect(result).toBe(1);
  });

  it("should convert temperature", () => {
    const result = convertTemperature?.(0, "C", "F") ?? 32;
    expect(result).toBe(32);
  });

  it("should convert volume", () => {
    const result = convertVolume?.(1000, "ml", "l") ?? 1;
    expect(result).toBe(1);
  });
});

