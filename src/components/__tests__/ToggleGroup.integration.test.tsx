import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";

describe("ToggleGroup Integration", () => {
  it("should render toggle group", async () => {
    const TG = await import("../ui/toggle-group");
    
    const { container } = render(
      <TG.ToggleGroup type="single">
        <TG.ToggleGroupItem value="a">A</TG.ToggleGroupItem>
        <TG.ToggleGroupItem value="b">B</TG.ToggleGroupItem>
      </TG.ToggleGroup>
    );

    expect(container).toBeTruthy();
  });
});

