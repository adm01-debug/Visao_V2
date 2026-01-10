import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";

describe("NavigationMenu Integration", () => {
  it("should render navigation menu", async () => {
    const Nav = await import("../ui/navigation-menu");
    
    const { container } = render(
      <Nav.NavigationMenu>
        <Nav.NavigationMenuList>
          <Nav.NavigationMenuItem>
            <Nav.NavigationMenuTrigger>Item 1</Nav.NavigationMenuTrigger>
          </Nav.NavigationMenuItem>
        </Nav.NavigationMenuList>
      </Nav.NavigationMenu>
    );

    expect(container).toBeTruthy();
  });
});

