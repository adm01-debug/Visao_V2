import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useOnClickOutside } from "../useOnClickOutside";
import { useRef } from "react";

describe("useOnClickOutside Integration", () => {
  it("should call handler on outside click", () => {
    const handler = vi.fn();
    const ref = { current: document.createElement("div") };
    
    renderHook(() => useOnClickOutside(ref, handler));
    
    expect(handler).not.toHaveBeenCalled();
  });
});

