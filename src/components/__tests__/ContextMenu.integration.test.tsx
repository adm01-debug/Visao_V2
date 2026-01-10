import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";

describe("ContextMenu Integration", () => {
  it("should render context menu", async () => {
    const Menu = await import("../ui/context-menu");
    
    const { container } = render(
      <Menu.ContextMenu>
        <Menu.ContextMenuTrigger>Right click</Menu.ContextMenuTrigger>
        <Menu.ContextMenuContent>
          <Menu.ContextMenuItem>Profile</Menu.ContextMenuItem>
        </Menu.ContextMenuContent>
      </Menu.ContextMenu>
    );

    expect(container).toBeTruthy();
  });
});

