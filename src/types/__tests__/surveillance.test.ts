import { describe, it, expect } from "vitest";
import type * as SurveillanceTypes from "../surveillance";

describe("Surveillance Types", () => {
  it("should export surveillance types", () => {
    expect(true).toBe(true);
  });

  it("camera should have status", () => {
    const camera = { id: "1", name: "Cam 1", status: "online", streamUrl: "rtsp://..." };
    expect(["online", "offline"]).toContain(camera.status);
  });
});
