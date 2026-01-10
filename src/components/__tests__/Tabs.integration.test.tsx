import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";

describe("Tabs Integration", () => {
  it("should render tabs", async () => {
    const Tabs = await import("../ui/tabs");
    
    const { container } = render(
      <Tabs.Tabs defaultValue="tab1">
        <Tabs.TabsList>
          <Tabs.TabsTrigger value="tab1">Tab 1</Tabs.TabsTrigger>
          <Tabs.TabsTrigger value="tab2">Tab 2</Tabs.TabsTrigger>
        </Tabs.TabsList>
        <Tabs.TabsContent value="tab1">Content 1</Tabs.TabsContent>
        <Tabs.TabsContent value="tab2">Content 2</Tabs.TabsContent>
      </Tabs.Tabs>
    );

    expect(container).toBeTruthy();
  });
});

