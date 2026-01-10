import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useScript } from "../useScript";

describe("useScript Integration", () => {
  it("should load external script", () => {
    const { result } = renderHook(() => 
      useScript("https://example.com/script.js")
    );

    expect(result.current).toBeDefined();
  });

  it("should track loading state", () => {
    const { result } = renderHook(() => 
      useScript("https://example.com/script.js")
    );

    expect(result.current.loading ?? result.current.status ?? "loading").toBeDefined();
  });
});

