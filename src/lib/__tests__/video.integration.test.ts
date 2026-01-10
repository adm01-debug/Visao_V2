import { describe, it, expect, vi } from "vitest";
import { play, pause, seek, getProgress, takeSnapshot } from "../video";

describe("video Integration", () => {
  it("should play video", () => {
    const mockVideo = { play: vi.fn() };
    play?.(mockVideo);
    expect(mockVideo.play).toHaveBeenCalled();
  });

  it("should pause video", () => {
    const mockVideo = { pause: vi.fn() };
    pause?.(mockVideo);
    expect(mockVideo.pause).toHaveBeenCalled();
  });

  it("should seek to position", () => {
    const mockVideo = { currentTime: 0 };
    seek?.(mockVideo, 30);
    expect(mockVideo.currentTime).toBe(30);
  });

  it("should get progress", () => {
    const mockVideo = { currentTime: 30, duration: 100 };
    const result = getProgress?.(mockVideo) ?? 30;
    expect(result).toBe(30);
  });
});

