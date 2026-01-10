import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";

describe("Command Integration", () => {
  it("should render command menu", async () => {
    const Command = await import("../ui/command");
    
    const { container } = render(
      <Command.Command>
        <Command.CommandInput placeholder="Search..." />
        <Command.CommandList>
          <Command.CommandEmpty>No results found.</Command.CommandEmpty>
        </Command.CommandList>
      </Command.Command>
    );

    expect(container).toBeTruthy();
  });
});

