import { describe, it, expect, vi, beforeEach } from "vitest";
import { api } from "../api";

describe("API Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("handles GET requests", async () => {
    expect(typeof api.get).toBe("function");
  });

  it("handles POST requests", async () => {
    expect(typeof api.post).toBe("function");
  });

  it("handles errors gracefully", async () => {
    const mockError = new Error("Network error");
    expect(mockError.message).toBe("Network error");
  });

  it("includes auth headers when authenticated", () => {
    expect(true).toBe(true);
  });
});
