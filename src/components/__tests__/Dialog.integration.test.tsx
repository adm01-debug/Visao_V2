import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";

describe("Dialog Integration", () => {
  it("should render dialog", async () => {
    const Dialog = await import("../ui/dialog");
    
    const { container } = render(
      <Dialog.Dialog>
        <Dialog.DialogTrigger>Open</Dialog.DialogTrigger>
        <Dialog.DialogContent>
          <Dialog.DialogHeader>
            <Dialog.DialogTitle>Title</Dialog.DialogTitle>
          </Dialog.DialogHeader>
        </Dialog.DialogContent>
      </Dialog.Dialog>
    );

    expect(container).toBeTruthy();
  });
});

