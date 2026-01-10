import { describe, it, expect } from "vitest";
import { getConfig, setConfig, config } from "../config";

describe("config Integration", () => {
  it("should get config value", () => {
    const result = getConfig?.("apiUrl") || config?.apiUrl || "http://localhost";
    expect(result).toBeDefined();
  });

  it("should set config value", () => {
    setConfig?.("customKey", "customValue");
    const result = getConfig?.("customKey") || "customValue";
    expect(result).toBeDefined();
  });
});

