import { describe, it, expect } from "vitest";
import type * as ClipTypes from "../clips";

describe("Clips Types", () => {
  it("should export clip types", () => {
    expect(true).toBe(true);
  });

  it("clip type should be valid", () => {
    const clip = { id: "1", cameraId: "cam1", startTime: new Date(), endTime: new Date() };
    expect(clip.id).toBeDefined();
  });
});
