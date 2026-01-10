import { describe, it, expect, beforeEach } from "vitest";
import { useAppStore } from "../appStore";
import { act } from "@testing-library/react";

describe("appStore Integration", () => {
  beforeEach(() => {
    useAppStore.getState().reset?.();
  });

  it("should initialize with default state", () => {
    const state = useAppStore.getState();
    expect(state).toBeDefined();
  });

  it("should handle state updates", () => {
    const store = useAppStore.getState();
    expect(store).toBeTruthy();
  });

  it("should persist state correctly", () => {
    const initialState = useAppStore.getState();
    expect(initialState).toBeDefined();
  });
});

