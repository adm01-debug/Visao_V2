import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";

describe("ScrollArea Integration", () => {
  it("should render scroll area", async () => {
    const { ScrollArea } = await import("../ui/scroll-area");
    
    const { container } = render(
      <ScrollArea className="h-[200px]">
        <div>Content</div>
      </ScrollArea>
    );

    expect(container).toBeTruthy();
  });
});

