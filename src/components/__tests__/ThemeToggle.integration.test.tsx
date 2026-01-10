import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";

describe("ThemeToggle Integration", () => {
  it("should render theme toggle", async () => {
    const { ThemeToggle } = await import("../../ThemeToggle");
    
    const { container } = render(<ThemeToggle />);

    expect(container.querySelector("button")).toBeTruthy();
  });
});

