import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";

describe("Slider Integration", () => {
  it("should render slider", async () => {
    const { Slider } = await import("../ui/slider");
    
    const { container } = render(
      <Slider defaultValue={[50]} max={100} step={1} />
    );

    expect(container).toBeTruthy();
  });
});

