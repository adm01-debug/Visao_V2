import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";

describe("HoverCard Integration", () => {
  it("should render hover card", async () => {
    const HC = await import("../ui/hover-card");
    
    const { container } = render(
      <HC.HoverCard>
        <HC.HoverCardTrigger>Hover me</HC.HoverCardTrigger>
        <HC.HoverCardContent>Content</HC.HoverCardContent>
      </HC.HoverCard>
    );

    expect(container).toBeTruthy();
  });
});

