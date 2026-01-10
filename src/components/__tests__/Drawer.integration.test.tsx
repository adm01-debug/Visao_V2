import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";

describe("Drawer Integration", () => {
  it("should render drawer", async () => {
    const Drawer = await import("../ui/drawer");
    
    const { container } = render(
      <Drawer.Drawer>
        <Drawer.DrawerTrigger>Open</Drawer.DrawerTrigger>
        <Drawer.DrawerContent>
          <Drawer.DrawerHeader>
            <Drawer.DrawerTitle>Title</Drawer.DrawerTitle>
          </Drawer.DrawerHeader>
        </Drawer.DrawerContent>
      </Drawer.Drawer>
    );

    expect(container).toBeTruthy();
  });
});

