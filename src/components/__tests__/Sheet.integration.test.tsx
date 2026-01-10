import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";

describe("Sheet Integration", () => {
  it("should render sheet", async () => {
    const Sheet = await import("../ui/sheet");
    
    const { container } = render(
      <Sheet.Sheet>
        <Sheet.SheetTrigger>Open</Sheet.SheetTrigger>
        <Sheet.SheetContent>
          <Sheet.SheetHeader>
            <Sheet.SheetTitle>Title</Sheet.SheetTitle>
          </Sheet.SheetHeader>
        </Sheet.SheetContent>
      </Sheet.Sheet>
    );

    expect(container).toBeTruthy();
  });
});

