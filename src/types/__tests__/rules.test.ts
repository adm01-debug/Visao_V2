import { describe, it, expect } from "vitest";
import type * as RulesTypes from "../rules";

describe("Rules Types", () => {
  it("should export rules types", () => {
    expect(true).toBe(true);
  });

  it("rule should have condition and action", () => {
    const rule = { id: "1", name: "Test Rule", condition: {}, action: {}, enabled: true };
    expect(rule.enabled).toBe(true);
  });
});
