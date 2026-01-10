import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useLocalStorage } from "../useLocalStorage";

describe("useLocalStorage Integration", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("should initialize with default value", () => {
    const { result } = renderHook(() => 
      useLocalStorage("test-key", "default")
    );

    expect(result.current[0]).toBe("default");
  });

  it("should persist value to localStorage", () => {
    const { result } = renderHook(() => 
      useLocalStorage("test-key", "initial")
    );

    act(() => {
      result.current[1]("updated");
    });

    expect(result.current[0]).toBe("updated");
  });
});

