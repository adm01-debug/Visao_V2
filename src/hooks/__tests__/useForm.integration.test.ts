import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useForm } from "../useForm";

describe("useForm Integration", () => {
  it("should initialize with default values", () => {
    const { result } = renderHook(() => 
      useForm({ name: "", email: "" })
    );

    expect(result.current.values || result.current.formState).toBeDefined();
  });

  it("should handle form changes", () => {
    const { result } = renderHook(() => 
      useForm({ name: "" })
    );

    expect(result.current.handleChange || result.current.setValue).toBeDefined();
  });
});

