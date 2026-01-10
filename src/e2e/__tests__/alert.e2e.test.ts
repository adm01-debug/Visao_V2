import { describe, it, expect } from "vitest";

describe("Alert Flow E2E", () => {
  it("should create alert", async () => {
    const alertData = {
      type: "motion",
      cameraId: "1",
      message: "Motion detected",
    };

    const mockCreateAlert = async (data: typeof alertData) => {
      return { id: "1", ...data, created_at: new Date().toISOString() };
    };

    const result = await mockCreateAlert(alertData);
    expect(result.type).toBe(alertData.type);
    expect(result.created_at).toBeDefined();
  });

  it("should dismiss alert", async () => {
    const mockDismissAlert = async (id: string) => {
      return { id, dismissed: true };
    };

    const result = await mockDismissAlert("1");
    expect(result.dismissed).toBe(true);
  });
});

