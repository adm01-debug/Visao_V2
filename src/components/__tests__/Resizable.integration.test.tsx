import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";

describe("Resizable Integration", () => {
  it("should render resizable panels", async () => {
    const Resizable = await import("../ui/resizable");
    
    const { container } = render(
      <Resizable.ResizablePanelGroup direction="horizontal">
        <Resizable.ResizablePanel>Panel 1</Resizable.ResizablePanel>
        <Resizable.ResizableHandle />
        <Resizable.ResizablePanel>Panel 2</Resizable.ResizablePanel>
      </Resizable.ResizablePanelGroup>
    );

    expect(container).toBeTruthy();
  });
});

