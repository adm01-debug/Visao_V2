import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";

describe("Progress Integration", () => {
  it("should render progress bar", async () => {
    const { Progress } = await import("../ui/progress");
    
    const { container } = render(
      <Progress value={50} />
    );

    expect(container).toBeTruthy();
  });
});

