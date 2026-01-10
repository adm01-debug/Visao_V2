import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useFavicon } from "../useFavicon";

describe("useFavicon Integration", () => {
  it("should set favicon", () => {
    renderHook(() => useFavicon("/favicon.ico"));

    const link = document.querySelector("link[rel*=icon]");
    expect(link).toBeDefined();
  });
});

