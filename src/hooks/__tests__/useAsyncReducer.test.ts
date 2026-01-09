import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAsyncReducer } from "../useAsyncReducer";

interface State {
  count: number;
  loading: boolean;
}

type Action = { type: "INCREMENT" } | { type: "DECREMENT" } | { type: "SET"; payload: number };

describe("useAsyncReducer", () => {
  const reducer = (state: State, action: Action): State => {
    switch (action.type) {
      case "INCREMENT":
        return { ...state, count: state.count + 1 };
      case "DECREMENT":
        return { ...state, count: state.count - 1 };
      case "SET":
        return { ...state, count: action.payload };
      default:
        return state;
    }
  };

  const initialState: State = { count: 0, loading: false };

  it("should handle sync actions", () => {
    const { result } = renderHook(() =>
      useAsyncReducer(reducer, initialState)
    );

    act(() => {
      result.current[1]({ type: "INCREMENT" });
    });

    expect(result.current[0].count).toBe(1);
  });

  it("should handle async dispatch", async () => {
    const { result } = renderHook(() =>
      useAsyncReducer(reducer, initialState)
    );

    await act(async () => {
      await result.current[1](async (dispatch) => {
        await new Promise((r) => setTimeout(r, 10));
        dispatch({ type: "SET", payload: 42 });
      });
    });

    expect(result.current[0].count).toBe(42);
  });
});

