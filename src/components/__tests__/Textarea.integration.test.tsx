import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";

describe("Textarea Integration", () => {
  it("should render textarea", async () => {
    const { Textarea } = await import("../ui/textarea");
    
    const { container } = render(<Textarea placeholder="Enter text" />);

    expect(container.querySelector("textarea")).toBeTruthy();
  });
});

