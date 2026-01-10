import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { usePermission } from "../usePermission";

describe("usePermission Integration", () => {
  it("should check permission state", () => {
    const { result } = renderHook(() => 
      usePermission("camera")
    );

    expect(result.current).toBeDefined();
  });
});

