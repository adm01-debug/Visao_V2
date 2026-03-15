import { describe, it, expect } from "vitest";
import { calculateStreamBandwidth, estimateRecordingSize, getRecommendedBitrate, getRecommendedFramerate, calculateLatency, isStreamHealthy } from "@/lib/streamUtils";

describe("streamUtils", () => {
  describe("calculateStreamBandwidth", () => {
    it("calculates bandwidth in bytes/s", () => {
      expect(calculateStreamBandwidth(8000, 4)).toBe(4000); // 8000*4/8
    });
    it("single camera", () => {
      expect(calculateStreamBandwidth(1000, 1)).toBe(125);
    });
  });

  describe("estimateRecordingSize", () => {
    it("calculates size in GB", () => {
      const size = estimateRecordingSize(8000, 24);
      expect(size).toBeGreaterThan(0);
    });
    it("0 hours = 0 GB", () => {
      expect(estimateRecordingSize(8000, 0)).toBe(0);
    });
  });

  describe("getRecommendedBitrate", () => {
    it("4K = 15000", () => { expect(getRecommendedBitrate("4K")).toBe(15000); });
    it("1080p = 8000", () => { expect(getRecommendedBitrate("1080p")).toBe(8000); });
    it("720p = 4000", () => { expect(getRecommendedBitrate("720p")).toBe(4000); });
    it("480p = 2000", () => { expect(getRecommendedBitrate("480p")).toBe(2000); });
    it("360p = 1000", () => { expect(getRecommendedBitrate("360p")).toBe(1000); });
    it("unknown = 4000 default", () => { expect(getRecommendedBitrate("240p")).toBe(4000); });
  });

  describe("getRecommendedFramerate", () => {
    it("live = 30", () => { expect(getRecommendedFramerate("live")).toBe(30); });
    it("recording = 15", () => { expect(getRecommendedFramerate("recording")).toBe(15); });
  });

  describe("calculateLatency", () => {
    it("calculates total latency", () => {
      expect(calculateLatency(50, 3, 30)).toBe(150); // 50 + (3/30)*1000 = 50+100
    });
  });

  describe("isStreamHealthy", () => {
    it("healthy when fps >= 80% and low packet loss", () => {
      expect(isStreamHealthy(28, 30, 1)).toBe(true);
    });
    it("unhealthy when fps too low", () => {
      expect(isStreamHealthy(20, 30, 0)).toBe(false);
    });
    it("unhealthy when packet loss >= 5%", () => {
      expect(isStreamHealthy(30, 30, 5)).toBe(false);
    });
    it("borderline healthy", () => {
      expect(isStreamHealthy(24, 30, 4.9)).toBe(true); // 24 >= 24
    });
  });
});
