import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useOnScreen } from "../useOnScreen";

describe("useOnScreen Integration", () => {
  it("should return visibility state", () => {
    const ref = { current: document.createElement("div") };
    const { result } = renderHook(() => useOnScreen(ref));

    expect(typeof result.current).toBe("boolean");
  });
});

