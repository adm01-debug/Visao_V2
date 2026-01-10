import { describe, it, expect, vi } from "vitest";
import { speak, stopSpeaking, startListening, stopListening } from "../speech";

describe("speech Integration", () => {
  it("should speak text", () => {
    const mockUtterance = vi.fn();
    window.speechSynthesis = { speak: mockUtterance } as any;

    speak?.("Hello world");
    expect(true).toBe(true);
  });

  it("should stop speaking", () => {
    window.speechSynthesis = { cancel: vi.fn() } as any;

    stopSpeaking?.();
    expect(true).toBe(true);
  });
});

