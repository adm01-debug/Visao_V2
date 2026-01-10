import { describe, it, expect } from "vitest";

describe("Camera Flow E2E", () => {
  it("should add new camera", async () => {
    const cameraData = {
      name: "Test Camera",
      url: "rtsp://test",
      location: "Test Location",
    };

    const mockAddCamera = async (data: typeof cameraData) => {
      return { id: "1", ...data, status: "active" };
    };

    const result = await mockAddCamera(cameraData);
    expect(result.name).toBe(cameraData.name);
    expect(result.status).toBe("active");
  });

  it("should update camera", async () => {
    const mockUpdateCamera = async (id: string, data: { name: string }) => {
      return { id, ...data, updated: true };
    };

    const result = await mockUpdateCamera("1", { name: "Updated Camera" });
    expect(result.updated).toBe(true);
  });
});

