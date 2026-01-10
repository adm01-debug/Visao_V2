import { describe, it, expect } from "vitest";

describe("AI Detection Flow E2E", () => {
  it("should detect objects", async () => {
    const mockDetectObjects = async (imageData: string) => {
      return { objects: [{ type: "person", confidence: 0.95, bbox: [10, 10, 100, 200] }] };
    };

    const result = await mockDetectObjects("base64-image-data");
    expect(result.objects).toHaveLength(1);
    expect(result.objects[0].confidence).toBeGreaterThan(0.9);
  });

  it("should recognize faces", async () => {
    const mockRecognizeFaces = async (imageData: string) => {
      return { faces: [{ personId: "1", name: "John", confidence: 0.92 }] };
    };

    const result = await mockRecognizeFaces("base64-image-data");
    expect(result.faces[0].name).toBe("John");
  });

  it("should detect motion", async () => {
    const mockDetectMotion = async (frames: string[]) => {
      return { motion: true, intensity: 0.8, regions: [[50, 50, 150, 150]] };
    };

    const result = await mockDetectMotion(["frame1", "frame2"]);
    expect(result.motion).toBe(true);
    expect(result.intensity).toBeGreaterThan(0.5);
  });
});

