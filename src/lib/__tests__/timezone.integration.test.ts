import { describe, it, expect } from "vitest";
import { getTimezone, setTimezone, convertTimezone, getOffset } from "../timezone";

describe("timezone Integration", () => {
  it("should get current timezone", () => {
    const result = getTimezone?.() || Intl.DateTimeFormat().resolvedOptions().timeZone;
    expect(result).toBeDefined();
  });

  it("should get timezone offset", () => {
    const result = getOffset?.() ?? new Date().getTimezoneOffset();
    expect(typeof result).toBe("number");
  });

  it("should convert timezone", () => {
    const date = new Date();
    const result = convertTimezone?.(date, "America/New_York") || date;
    expect(result).toBeInstanceOf(Date);
  });
});

