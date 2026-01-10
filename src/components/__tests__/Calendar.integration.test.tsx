import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";

describe("Calendar Integration", () => {
  it("should render calendar", async () => {
    const { Calendar } = await import("../ui/calendar");
    
    const { container } = render(<Calendar />);

    expect(container).toBeTruthy();
  });
});

