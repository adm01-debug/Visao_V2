import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";

describe("Select Integration", () => {
  it("should render select", async () => {
    const Select = await import("../ui/select");
    
    const { container } = render(
      <Select.Select>
        <Select.SelectTrigger>
          <Select.SelectValue placeholder="Select..." />
        </Select.SelectTrigger>
        <Select.SelectContent>
          <Select.SelectItem value="1">Option 1</Select.SelectItem>
        </Select.SelectContent>
      </Select.Select>
    );

    expect(container).toBeTruthy();
  });
});

