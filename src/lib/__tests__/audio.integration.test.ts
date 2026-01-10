import { describe, it, expect, vi } from "vitest";
import { play, pause, stop, setVolume, getVolume } from "../audio";

describe("audio Integration", () => {
  it("should play audio", () => {
    const mockAudio = { play: vi.fn() };
    play?.(mockAudio);
    expect(mockAudio.play).toHaveBeenCalled();
  });

  it("should pause audio", () => {
    const mockAudio = { pause: vi.fn() };
    pause?.(mockAudio);
    expect(mockAudio.pause).toHaveBeenCalled();
  });

  it("should set volume", () => {
    const mockAudio = { volume: 1 };
    setVolume?.(mockAudio, 0.5);
    expect(mockAudio.volume).toBe(0.5);
  });
});

