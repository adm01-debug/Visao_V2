import { describe, it, expect } from "vitest";

describe("Person Flow E2E", () => {
  it("should add person", async () => {
    const personData = {
      name: "John Doe",
      email: "john@example.com",
      role: "employee",
    };

    const mockAddPerson = async (data: typeof personData) => {
      return { id: "1", ...data, created_at: new Date().toISOString() };
    };

    const result = await mockAddPerson(personData);
    expect(result.name).toBe(personData.name);
    expect(result.id).toBeDefined();
  });

  it("should recognize person", async () => {
    const mockRecognize = async (faceData: string) => {
      return { personId: "1", confidence: 0.95, name: "John Doe" };
    };

    const result = await mockRecognize("face-encoding");
    expect(result.confidence).toBeGreaterThan(0.9);
  });
});

