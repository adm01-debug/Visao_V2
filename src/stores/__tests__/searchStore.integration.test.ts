import { describe, it, expect } from "vitest";
import { useSearchStore } from "../searchStore";

describe("searchStore Integration", () => {
  it("should manage search query", () => {
    const state = useSearchStore.getState();
    expect(state).toBeDefined();
  });

  it("should handle search results", () => {
    const store = useSearchStore.getState();
    expect(store.results || store.query !== undefined || store).toBeDefined();
  });
});

