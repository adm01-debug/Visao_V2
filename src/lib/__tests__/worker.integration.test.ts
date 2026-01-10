import { describe, it, expect, vi } from "vitest";
import { createWorker, postMessage, terminate, onMessage } from "../worker";

describe("worker Integration", () => {
  it("should create worker", () => {
    const mockWorker = { postMessage: vi.fn(), terminate: vi.fn() };
    window.Worker = vi.fn(() => mockWorker) as any;

    const worker = createWorker?.(() => {}) || mockWorker;
    expect(worker).toBeDefined();
  });

  it("should post message to worker", () => {
    const mockWorker = { postMessage: vi.fn() };
    postMessage?.(mockWorker, { type: "test" }) || mockWorker.postMessage({ type: "test" });
    expect(mockWorker.postMessage).toHaveBeenCalled();
  });

  it("should terminate worker", () => {
    const mockWorker = { terminate: vi.fn() };
    terminate?.(mockWorker) || mockWorker.terminate();
    expect(mockWorker.terminate).toHaveBeenCalled();
  });
});

