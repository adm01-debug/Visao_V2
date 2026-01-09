import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAmbientLight } from "../useAmbientLight";

interface MockAmbientLightSensor {
  illuminance: number;
  start: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
}

type EventCallback = [string, () => void];

describe("useAmbientLight", () => {
  let mockSensor: MockAmbientLightSensor;
  let originalAmbientLightSensor: unknown;

  beforeEach(() => {
    mockSensor = {
      illuminance: 100,
      start: vi.fn(),
      stop: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };

    originalAmbientLightSensor = (window as Record<string, unknown>).AmbientLightSensor;

    (window as Record<string, unknown>).AmbientLightSensor = vi.fn(() => mockSensor);
  });

  afterEach(() => {
    (window as Record<string, unknown>).AmbientLightSensor = originalAmbientLightSensor;
  });

  it("should return illuminance value", async () => {
    const { result } = renderHook(() => useAmbientLight());

    await act(async () => {
      const readingCallback = mockSensor.addEventListener.mock.calls.find(
        (call: EventCallback) => call[0] === "reading"
      );
      if (readingCallback) {
        readingCallback[1]();
      }
    });

    expect(result.current.illuminance).toBe(100);
  });

  it("should handle errors", async () => {
    const { result } = renderHook(() => useAmbientLight());

    await act(async () => {
      const errorCallback = mockSensor.addEventListener.mock.calls.find(
        (call: EventCallback) => call[0] === "error"
      );
      if (errorCallback) {
        errorCallback[1]();
      }
    });

    expect(result.current.error).toBeDefined();
  });

  it("should handle unsupported browsers", () => {
    (window as Record<string, unknown>).AmbientLightSensor = undefined;

    const { result } = renderHook(() => useAmbientLight());

    expect(result.current.supported).toBe(false);
  });
});

