import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";

describe("AlertDialog Integration", () => {
  it("should render alert dialog", async () => {
    const AD = await import("../ui/alert-dialog");
    
    const { container } = render(
      <AD.AlertDialog>
        <AD.AlertDialogTrigger>Open</AD.AlertDialogTrigger>
        <AD.AlertDialogContent>
          <AD.AlertDialogHeader>
            <AD.AlertDialogTitle>Title</AD.AlertDialogTitle>
          </AD.AlertDialogHeader>
        </AD.AlertDialogContent>
      </AD.AlertDialog>
    );

    expect(container).toBeTruthy();
  });
});

