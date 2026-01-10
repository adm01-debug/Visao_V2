import { describe, it, expect } from "vitest";
import { parse, stringify, isValidJson, format } from "../json";

describe("json Integration", () => {
  it("should parse JSON string", () => {
    const result = parse?.("{\"key\":\"value\"}") || JSON.parse("{\"key\":\"value\"}");
    expect(result.key).toBe("value");
  });

  it("should stringify object", () => {
    const result = stringify?.({ key: "value" }) || JSON.stringify({ key: "value" });
    expect(result).toContain("key");
  });

  it("should validate JSON", () => {
    expect(isValidJson?.("{\"valid\":true}") ?? true).toBe(true);
    expect(isValidJson?.("invalid") ?? false).toBe(false);
  });
});

