import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useReducerWithMiddleware } from "../useReducerWithMiddleware";

type Action = { type: "INC" } | { type: "DEC" } | { type: "SET"; value: number };

describe("useReducerWithMiddleware", () => {
  const reducer = (state: number, action: Action): number => {
    switch (action.type) {
      case "INC":
        return state + 1;
      case "DEC":
        return state - 1;
      case "SET":
        return action.value;
      default:
        return state;
    }
  };

  it("should work without middleware", () => {
    const { result } = renderHook(() =>
      useReducerWithMiddleware(reducer, 0, [])
    );

    act(() => {
      result.current[1]({ type: "INC" });
    });

    expect(result.current[0]).toBe(1);
  });

  it("should apply logging middleware", () => {
    const logSpy = vi.fn();
    const loggerMiddleware = (
      next: (action: Action) => void
    ) => (action: Action) => {
      logSpy(action);
      next(action);
    };

    const { result } = renderHook(() =>
      useReducerWithMiddleware(reducer, 0, [loggerMiddleware])
    );

    act(() => {
      result.current[1]({ type: "INC" });
    });

    expect(logSpy).toHaveBeenCalledWith({ type: "INC" });
    expect(result.current[0]).toBe(1);
  });

  it("should chain multiple middleware", () => {
    const calls: string[] = [];

    const middleware1 = (next: (action: Action) => void) => (action: Action) => {
      calls.push("m1-before");
      next(action);
      calls.push("m1-after");
    };

    const middleware2 = (next: (action: Action) => void) => (action: Action) => {
      calls.push("m2-before");
      next(action);
      calls.push("m2-after");
    };

    const { result } = renderHook(() =>
      useReducerWithMiddleware(reducer, 0, [middleware1, middleware2])
    );

    act(() => {
      result.current[1]({ type: "INC" });
    });

    expect(calls).toEqual(["m1-before", "m2-before", "m2-after", "m1-after"]);
  });
});

