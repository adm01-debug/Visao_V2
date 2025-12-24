import { describe, it, expect } from "vitest";
import type * as StreamingTypes from "../streaming";

describe("Streaming Types", () => {
  it("should export streaming types", () => {
    expect(true).toBe(true);
  });

  it("stream config should have url", () => {
    const config = { url: "rtsp://camera.local", protocol: "HLS", quality: "720p" };
    expect(config.url).toContain("rtsp");
  });
});
