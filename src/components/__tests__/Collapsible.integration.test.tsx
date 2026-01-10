import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";

describe("Collapsible Integration", () => {
  it("should render collapsible", async () => {
    const Collapsible = await import("../ui/collapsible");
    
    const { container } = render(
      <Collapsible.Collapsible>
        <Collapsible.CollapsibleTrigger>Toggle</Collapsible.CollapsibleTrigger>
        <Collapsible.CollapsibleContent>Content</Collapsible.CollapsibleContent>
      </Collapsible.Collapsible>
    );

    expect(container).toBeTruthy();
  });
});

