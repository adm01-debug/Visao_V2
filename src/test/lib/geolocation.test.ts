import { describe, it, expect } from "vitest";
import { isSupported } from "@/lib/geolocation";

describe("geolocation", () => {
  it("isSupported returns boolean", () => {
    expect(typeof isSupported()).toBe("boolean");
  });
});
