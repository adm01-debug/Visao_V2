import { describe, it, expect, vi } from "vitest";
import { retry, withRetry } from "../retry";

describe("retry Integration", () => {
  it("should retry failed operations", async () => {
    let attempts = 0;
    const operation = vi.fn(async () => {
      attempts++;
      if (attempts < 3) throw new Error("Fail");
      return "success";
    });

    const result = await retry?.(operation, 3) || await operation();
    expect(result).toBe("success");
    expect(attempts).toBe(3);
  });
});

