import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";

describe("LoadingSpinner Integration", () => {
  it("should render loading spinner", async () => {
    const { LoadingSpinner } = await import("../../LoadingSpinner");
    
    const { container } = render(<LoadingSpinner />);

    expect(container).toBeTruthy();
  });
});

