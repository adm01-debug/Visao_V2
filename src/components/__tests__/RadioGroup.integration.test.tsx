import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";

describe("RadioGroup Integration", () => {
  it("should render radio group", async () => {
    const RG = await import("../ui/radio-group");
    
    const { container } = render(
      <RG.RadioGroup defaultValue="a">
        <RG.RadioGroupItem value="a" id="a" />
        <RG.RadioGroupItem value="b" id="b" />
      </RG.RadioGroup>
    );

    expect(container).toBeTruthy();
  });
});

