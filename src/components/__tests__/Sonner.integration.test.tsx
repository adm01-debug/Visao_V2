import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";

describe("Sonner Integration", () => {
  it("should render toaster", async () => {
    const { Toaster } = await import("../ui/sonner");
    
    const { container } = render(<Toaster />);

    expect(container).toBeTruthy();
  });
});

