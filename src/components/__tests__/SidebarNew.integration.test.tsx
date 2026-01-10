import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";

describe("SidebarNew Integration", () => {
  it("should render sidebar provider", async () => {
    const Sidebar = await import("../ui/sidebar");
    
    const { container } = render(
      <Sidebar.SidebarProvider>
        <Sidebar.Sidebar>
          <Sidebar.SidebarContent>Content</Sidebar.SidebarContent>
        </Sidebar.Sidebar>
      </Sidebar.SidebarProvider>
    );

    expect(container).toBeTruthy();
  });
});

