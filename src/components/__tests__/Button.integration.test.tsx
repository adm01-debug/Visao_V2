import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";

describe("Button Integration", () => {
  it("should render button variants", async () => {
    const { Button } = await import("../ui/button");
    
    const { container } = render(
      <>
        <Button variant="default">Default</Button>
        <Button variant="destructive">Destructive</Button>
        <Button variant="outline">Outline</Button>
      </>
    );

    expect(container.querySelectorAll("button")).toHaveLength(3);
  });
});

