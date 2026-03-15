import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useUndo } from "@/hooks/useUndo";

describe("useUndo", () => {
  it("initializes with state", () => {
    const { result } = renderHook(() => useUndo("hello"));
    expect(result.current.state).toBe("hello");
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });

  it("set updates state", () => {
    const { result } = renderHook(() => useUndo(0));
    act(() => result.current.set(1));
    expect(result.current.state).toBe(1);
    expect(result.current.canUndo).toBe(true);
  });

  it("undo restores previous", () => {
    const { result } = renderHook(() => useUndo(0));
    act(() => result.current.set(1));
    act(() => result.current.set(2));
    act(() => result.current.undo());
    expect(result.current.state).toBe(1);
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(true);
  });

  it("redo re-applies", () => {
    const { result } = renderHook(() => useUndo(0));
    act(() => result.current.set(1));
    act(() => result.current.undo());
    act(() => result.current.redo());
    expect(result.current.state).toBe(1);
    expect(result.current.canRedo).toBe(false);
  });

  it("can't undo past beginning", () => {
    const { result } = renderHook(() => useUndo(0));
    act(() => result.current.undo());
    expect(result.current.state).toBe(0);
  });

  it("can't redo past end", () => {
    const { result } = renderHook(() => useUndo(0));
    act(() => result.current.redo());
    expect(result.current.state).toBe(0);
  });

  it("new set after undo clears redo", () => {
    const { result } = renderHook(() => useUndo(0));
    act(() => result.current.set(1));
    act(() => result.current.set(2));
    act(() => result.current.undo());
    act(() => result.current.set(3));
    expect(result.current.canRedo).toBe(false);
    expect(result.current.state).toBe(3);
  });

  it("reset restores initial", () => {
    const { result } = renderHook(() => useUndo("init"));
    act(() => result.current.set("changed"));
    act(() => result.current.reset());
    expect(result.current.state).toBe("init");
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });

  it("set with function updater", () => {
    const { result } = renderHook(() => useUndo(10));
    act(() => result.current.set(prev => prev + 5));
    expect(result.current.state).toBe(15);
  });

  it("multiple undo/redo cycles", () => {
    const { result } = renderHook(() => useUndo(0));
    act(() => result.current.set(1));
    act(() => result.current.set(2));
    act(() => result.current.set(3));
    act(() => result.current.undo()); // 2
    act(() => result.current.undo()); // 1
    act(() => result.current.redo()); // 2
    expect(result.current.state).toBe(2);
  });
});
