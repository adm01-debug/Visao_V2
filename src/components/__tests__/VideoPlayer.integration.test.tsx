import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";

describe("VideoPlayer Integration", () => {
  it("should render video player", async () => {
    const { VideoPlayer } = await import("../../VideoPlayer");
    
    const { container } = render(
      <VideoPlayer src="https://test.com/video.mp4" />
    );

    expect(container).toBeTruthy();
  });
});

