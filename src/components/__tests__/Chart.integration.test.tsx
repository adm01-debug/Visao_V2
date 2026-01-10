import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";

describe("Chart Integration", () => {
  it("should render chart container", async () => {
    const { ChartContainer } = await import("../ui/chart");
    
    const { container } = render(
      <ChartContainer config={{}}>
        <div>Chart content</div>
      </ChartContainer>
    );

    expect(container).toBeTruthy();
  });
});

