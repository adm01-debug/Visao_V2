import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";

describe("DatePicker Integration", () => {
  it("should render date picker", async () => {
    const { DatePicker } = await import("../ui/date-picker");
    
    const { container } = render(<DatePicker />);

    expect(container).toBeTruthy();
  });
});

