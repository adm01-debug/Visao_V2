import { describe, it, expect } from "vitest";
import { buildRTSPUrl, buildONVIFUrl, buildSnapshotUrl, parseRTSPUrl, getCameraStatusColor, estimateStoragePerDay, type CameraConfig } from "@/lib/cameraUtils";

describe("cameraUtils", () => {
  const config: CameraConfig = { id: "1", name: "Cam1", ip: "192.168.1.100", port: 554, protocol: "rtsp", username: "admin", password: "pass" };
  const noAuthConfig: CameraConfig = { id: "2", name: "Cam2", ip: "10.0.0.1", port: 8080, protocol: "http" };

  describe("buildRTSPUrl", () => {
    it("builds with auth", () => { expect(buildRTSPUrl(config)).toBe("rtsp://admin:pass@192.168.1.100:554/stream"); });
    it("builds without auth", () => { expect(buildRTSPUrl(noAuthConfig)).toBe("rtsp://10.0.0.1:8080/stream"); });
    it("handles empty password", () => {
      const c = { ...config, password: undefined };
      expect(buildRTSPUrl(c)).toBe("rtsp://admin:@192.168.1.100:554/stream");
    });
  });

  describe("buildONVIFUrl", () => {
    it("builds correctly", () => { expect(buildONVIFUrl(config)).toBe("http://192.168.1.100:554/onvif/device_service"); });
  });

  describe("buildSnapshotUrl", () => {
    it("builds correctly", () => { expect(buildSnapshotUrl(config)).toBe("http://192.168.1.100:554/snapshot.jpg"); });
  });

  describe("parseRTSPUrl", () => {
    it("parses with auth", () => {
      const parsed = parseRTSPUrl("rtsp://admin:pass@192.168.1.100:554/stream");
      expect(parsed.username).toBe("admin");
      expect(parsed.password).toBe("pass");
      expect(parsed.ip).toBe("192.168.1.100");
      expect(parsed.port).toBe(554);
    });
    it("parses without auth", () => {
      const parsed = parseRTSPUrl("rtsp://10.0.0.1:8080/live");
      expect(parsed.ip).toBe("10.0.0.1");
      expect(parsed.port).toBe(8080);
    });
    it("returns empty for invalid", () => { expect(parseRTSPUrl("not-a-url")).toEqual({}); });
    it("defaults port to 554", () => { expect(parseRTSPUrl("rtsp://10.0.0.1/stream")?.port).toBe(554); });
  });

  describe("getCameraStatusColor", () => {
    it("online = green", () => { expect(getCameraStatusColor("online")).toBe("#22c55e"); });
    it("offline = red", () => { expect(getCameraStatusColor("offline")).toBe("#ef4444"); });
    it("recording = blue", () => { expect(getCameraStatusColor("recording")).toBe("#3b82f6"); });
    it("alert = amber", () => { expect(getCameraStatusColor("alert")).toBe("#f59e0b"); });
    it("unknown = gray", () => { expect(getCameraStatusColor("unknown")).toBe("#6b7280"); });
  });

  describe("estimateStoragePerDay", () => {
    it("returns number for valid input", () => {
      const gb = estimateStoragePerDay(4, 24);
      expect(typeof gb).toBe("number");
      expect(gb).toBeGreaterThan(0);
    });
    it("0 bitrate = 0 storage", () => { expect(estimateStoragePerDay(0)).toBe(0); });
    it("more hours = more storage", () => {
      expect(estimateStoragePerDay(4, 24)).toBeGreaterThan(estimateStoragePerDay(4, 12));
    });
  });
});
