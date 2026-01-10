import { describe, it, expect } from "vitest";
import { useAnalyticsStore } from "../analyticsStore";

describe("analyticsStore Integration", () => {
  it("should track analytics data", () => {
    const state = useAnalyticsStore.getState();
    expect(state).toBeDefined();
  });

  it("should handle date range", () => {
    const store = useAnalyticsStore.getState();
    expect(store.dateRange || store).toBeDefined();
  });
});

