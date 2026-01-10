import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";

describe("Menubar Integration", () => {
  it("should render menubar", async () => {
    const Menu = await import("../ui/menubar");
    
    const { container } = render(
      <Menu.Menubar>
        <Menu.MenubarMenu>
          <Menu.MenubarTrigger>File</Menu.MenubarTrigger>
          <Menu.MenubarContent>
            <Menu.MenubarItem>New</Menu.MenubarItem>
          </Menu.MenubarContent>
        </Menu.MenubarMenu>
      </Menu.Menubar>
    );

    expect(container).toBeTruthy();
  });
});

