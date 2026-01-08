import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAppStore } from "../appStore";

describe("appStore", () => {
  beforeEach(() => {
    // Reset store state before each test
    useAppStore.getState().reset();
  });

  it("should have default state", () => {
    const { result } = renderHook(() => useAppStore());
    
    expect(result.current.isInitialized).toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.sidebarOpen).toBe(true);
    expect(result.current.currentPage).toBe("/");
  });

  it("should toggle sidebar", () => {
    const { result } = renderHook(() => useAppStore());
    
    expect(result.current.sidebarOpen).toBe(true);
    
    act(() => {
      result.current.toggleSidebar();
    });
    
    expect(result.current.sidebarOpen).toBe(false);
    
    act(() => {
      result.current.toggleSidebar();
    });
    
    expect(result.current.sidebarOpen).toBe(true);
  });

  it("should set loading state", () => {
    const { result } = renderHook(() => useAppStore());
    
    act(() => {
      result.current.setLoading(true);
    });
    
    expect(result.current.isLoading).toBe(true);
  });

  it("should set error", () => {
    const { result } = renderHook(() => useAppStore());
    
    act(() => {
      result.current.setError("Test error");
    });
    
    expect(result.current.error).toBe("Test error");
  });

  it("should set current page", () => {
    const { result } = renderHook(() => useAppStore());
    
    act(() => {
      result.current.setCurrentPage("/dashboard");
    });
    
    expect(result.current.currentPage).toBe("/dashboard");
  });

  it("should reset to initial state", () => {
    const { result } = renderHook(() => useAppStore());
    
    act(() => {
      result.current.setLoading(true);
      result.current.setError("Test error");
      result.current.setCurrentPage("/test");
    });
    
    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBe("Test error");
    
    act(() => {
      result.current.reset();
    });
    
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.currentPage).toBe("/");
  });
});
