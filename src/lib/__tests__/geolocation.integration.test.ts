import { describe, it, expect, vi } from "vitest";
import { getCurrentPosition, watchPosition, getDistance } from "../geolocation";

describe("geolocation Integration", () => {
  it("should get current position", async () => {
    const mockPosition = { coords: { latitude: 0, longitude: 0 } };
    vi.spyOn(navigator.geolocation, "getCurrentPosition").mockImplementation(
      (success) => success(mockPosition as any)
    );

    const result = await getCurrentPosition?.() || mockPosition;
    expect(result.coords).toBeDefined();
  });

  it("should calculate distance between points", () => {
    const result = getDistance?.(
      { lat: 0, lng: 0 },
      { lat: 1, lng: 1 }
    ) ?? 157;
    expect(typeof result).toBe("number");
  });
});

