import { describe, it, expect } from "vitest";
import config from "@/lib/config";

describe("lib/config", () => {
  beforeEach(() => config.clear());

  it("set/get stores and retrieves", () => {
    config.set("key", "value");
    expect(config.get("key")).toBe("value");
  });

  it("get returns undefined for missing", () => {
    expect(config.get("missing")).toBeUndefined();
  });

  it("get returns defaultValue for missing", () => {
    expect(config.get("missing", "default")).toBe("default");
  });

  it("has checks existence", () => {
    config.set("k", 1);
    expect(config.has("k")).toBe(true);
    expect(config.has("nope")).toBe(false);
  });

  it("remove deletes key", () => {
    config.set("k", 1);
    config.remove("k");
    expect(config.has("k")).toBe(false);
  });

  it("getAll returns copy", () => {
    config.set("a", 1);
    config.set("b", 2);
    const all = config.getAll();
    expect(all).toEqual({ a: 1, b: 2 });
    all["c"] = 3; // mutate copy
    expect(config.has("c")).toBe(false);
  });

  it("setAll replaces all config", () => {
    config.set("old", 1);
    config.setAll({ new: 2 });
    expect(config.has("old")).toBe(false);
    expect(config.get("new")).toBe(2);
  });

  it("clear removes everything", () => {
    config.set("a", 1);
    config.clear();
    expect(config.getAll()).toEqual({});
  });

  it("stores complex values", () => {
    config.set("obj", { nested: { arr: [1, 2] } });
    expect(config.get("obj")).toEqual({ nested: { arr: [1, 2] } });
  });
});
