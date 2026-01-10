import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useQueue } from "../useQueue";

describe("useQueue Integration", () => {
  it("should initialize empty queue", () => {
    const { result } = renderHook(() => useQueue([]));

    expect(result.current.queue ?? result.current[0]).toHaveLength(0);
  });

  it("should add items to queue", () => {
    const { result } = renderHook(() => useQueue([]));

    act(() => {
      (result.current.add ?? result.current.enqueue ?? result.current[1])("item");
    });

    expect(result.current.queue ?? result.current[0]).toContain("item");
  });
});

