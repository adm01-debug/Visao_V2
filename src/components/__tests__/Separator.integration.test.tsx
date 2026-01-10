import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";

describe("Separator Integration", () => {
  it("should render separator", async () => {
    const { Separator } = await import("../ui/separator");
    
    const { container } = render(<Separator />);

    expect(container).toBeTruthy();
  });
});

