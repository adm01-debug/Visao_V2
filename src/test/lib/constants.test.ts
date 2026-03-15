import { describe, it, expect } from "vitest";
import { SEVERITY_LEVELS, CAMERA_STATUSES, ALERT_TYPES, NOTIFICATION_CHANNELS, DEFAULT_PAGE_SIZE, MAX_FILE_SIZE, SUPPORTED_IMAGE_FORMATS, SUPPORTED_VIDEO_FORMATS, ROUTES } from "@/lib/constants";

describe("constants", () => {
  it("SEVERITY_LEVELS has expected values", () => {
    expect(SEVERITY_LEVELS).toEqual(["low", "medium", "high", "critical"]);
  });

  it("CAMERA_STATUSES has expected values", () => {
    expect(CAMERA_STATUSES).toEqual(["online", "offline", "error"]);
  });

  it("ALERT_TYPES has expected values", () => {
    expect(ALERT_TYPES).toEqual(["motion", "face", "zone", "plate", "ppe"]);
  });

  it("NOTIFICATION_CHANNELS has expected values", () => {
    expect(NOTIFICATION_CHANNELS).toEqual(["telegram", "email", "webhook", "push"]);
  });

  it("DEFAULT_PAGE_SIZE is reasonable", () => {
    expect(DEFAULT_PAGE_SIZE).toBeGreaterThan(0);
    expect(DEFAULT_PAGE_SIZE).toBeLessThanOrEqual(100);
  });

  it("MAX_FILE_SIZE is 10MB", () => {
    expect(MAX_FILE_SIZE).toBe(10 * 1024 * 1024);
  });

  it("SUPPORTED_IMAGE_FORMATS includes common formats", () => {
    expect(SUPPORTED_IMAGE_FORMATS).toContain("image/jpeg");
    expect(SUPPORTED_IMAGE_FORMATS).toContain("image/png");
  });

  it("SUPPORTED_VIDEO_FORMATS includes common formats", () => {
    expect(SUPPORTED_VIDEO_FORMATS).toContain("video/mp4");
  });

  it("ROUTES has required paths", () => {
    expect(ROUTES.DASHBOARD).toBe("/dashboard");
    expect(ROUTES.CAMERAS).toBe("/cameras");
    expect(ROUTES.ALERTS).toBe("/alerts");
    expect(ROUTES.SETTINGS).toBe("/settings");
    expect(ROUTES.HOME).toBe("/");
  });

  it("all arrays are readonly (frozen)", () => {
    // as const makes them readonly tuples
    expect(() => { (SEVERITY_LEVELS as any).push("x"); }).toThrow();
  });
});
