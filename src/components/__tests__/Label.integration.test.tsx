import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";

describe("Label Integration", () => {
  it("should render label", async () => {
    const { Label } = await import("../ui/label");
    
    const { container } = render(<Label>Test Label</Label>);

    expect(container).toBeTruthy();
  });
});

