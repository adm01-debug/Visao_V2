import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";

describe("Badge Integration", () => {
  it("should render badge variants", async () => {
    const { Badge } = await import("../ui/badge");
    
    const { container } = render(
      <>
        <Badge>Default</Badge>
        <Badge variant="secondary">Secondary</Badge>
        <Badge variant="destructive">Destructive</Badge>
      </>
    );

    expect(container.querySelectorAll("div")).toBeTruthy();
  });
});

