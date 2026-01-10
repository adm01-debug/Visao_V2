import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";

describe("Checkbox Integration", () => {
  it("should render checkbox", async () => {
    const { Checkbox } = await import("../ui/checkbox");
    
    const { container } = render(<Checkbox />);

    expect(container).toBeTruthy();
  });
});

