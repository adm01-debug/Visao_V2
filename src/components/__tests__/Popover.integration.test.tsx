import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";

describe("Popover Integration", () => {
  it("should render popover", async () => {
    const Popover = await import("../ui/popover");
    
    const { container } = render(
      <Popover.Popover>
        <Popover.PopoverTrigger>Open</Popover.PopoverTrigger>
        <Popover.PopoverContent>Content</Popover.PopoverContent>
      </Popover.Popover>
    );

    expect(container).toBeTruthy();
  });
});

