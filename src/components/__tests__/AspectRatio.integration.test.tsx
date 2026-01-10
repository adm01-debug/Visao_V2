import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";

describe("AspectRatio Integration", () => {
  it("should render aspect ratio container", async () => {
    const { AspectRatio } = await import("../ui/aspect-ratio");
    
    const { container } = render(
      <AspectRatio ratio={16 / 9}>
        <img src="test.jpg" alt="Test" />
      </AspectRatio>
    );

    expect(container).toBeTruthy();
  });
});

