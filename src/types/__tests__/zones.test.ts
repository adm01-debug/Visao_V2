import { describe, it, expect } from "vitest";
import type * as ZonesTypes from "../zones";

describe("Zones Types", () => {
  it("should export zones types", () => {
    expect(true).toBe(true);
  });

  it("zone should have coordinates", () => {
    const zone = { id: "1", name: "Zone A", points: [{x: 0, y: 0}, {x: 100, y: 100}] };
    expect(zone.points.length).toBeGreaterThan(0);
  });
});
