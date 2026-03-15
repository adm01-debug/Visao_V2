import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePagination } from "@/hooks/usePagination";

describe("usePagination", () => {
  it("initializes correctly", () => {
    const { result } = renderHook(() => usePagination({ totalItems: 100 }));
    expect(result.current.currentPage).toBe(1);
    expect(result.current.totalPages).toBe(10);
    expect(result.current.perPage).toBe(10);
    expect(result.current.startIndex).toBe(0);
    expect(result.current.endIndex).toBe(10);
    expect(result.current.hasNext).toBe(true);
    expect(result.current.hasPrev).toBe(false);
  });

  it("custom initial page and perPage", () => {
    const { result } = renderHook(() => usePagination({ totalItems: 50, initialPage: 3, itemsPerPage: 5 }));
    expect(result.current.currentPage).toBe(3);
    expect(result.current.totalPages).toBe(10);
    expect(result.current.startIndex).toBe(10);
    expect(result.current.endIndex).toBe(15);
  });

  it("nextPage advances", () => {
    const { result } = renderHook(() => usePagination({ totalItems: 30, itemsPerPage: 10 }));
    act(() => result.current.nextPage());
    expect(result.current.currentPage).toBe(2);
  });

  it("prevPage goes back", () => {
    const { result } = renderHook(() => usePagination({ totalItems: 30, initialPage: 2 }));
    act(() => result.current.prevPage());
    expect(result.current.currentPage).toBe(1);
  });

  it("can't go past last page", () => {
    const { result } = renderHook(() => usePagination({ totalItems: 20, itemsPerPage: 10 }));
    act(() => result.current.nextPage());
    act(() => result.current.nextPage());
    expect(result.current.currentPage).toBe(2);
    expect(result.current.hasNext).toBe(false);
  });

  it("can't go before first page", () => {
    const { result } = renderHook(() => usePagination({ totalItems: 20 }));
    act(() => result.current.prevPage());
    expect(result.current.currentPage).toBe(1);
  });

  it("goToPage works", () => {
    const { result } = renderHook(() => usePagination({ totalItems: 100 }));
    act(() => result.current.goToPage(5));
    expect(result.current.currentPage).toBe(5);
  });

  it("firstPage/lastPage", () => {
    const { result } = renderHook(() => usePagination({ totalItems: 100, initialPage: 5 }));
    act(() => result.current.firstPage());
    expect(result.current.currentPage).toBe(1);
    act(() => result.current.lastPage());
    expect(result.current.currentPage).toBe(10);
  });

  it("endIndex doesn't exceed totalItems", () => {
    const { result } = renderHook(() => usePagination({ totalItems: 15, itemsPerPage: 10 }));
    act(() => result.current.nextPage());
    expect(result.current.endIndex).toBe(15);
  });

  it("setPerPage changes items per page", () => {
    const { result } = renderHook(() => usePagination({ totalItems: 100 }));
    act(() => result.current.setPerPage(25));
    expect(result.current.totalPages).toBe(4);
  });
});
