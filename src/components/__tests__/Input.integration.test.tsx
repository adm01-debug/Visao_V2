import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";

describe("Input Integration", () => {
  it("should render input", async () => {
    const { Input } = await import("../ui/input");
    
    const { container } = render(<Input type="text" placeholder="Enter text" />);

    expect(container.querySelector("input")).toBeTruthy();
  });
});

