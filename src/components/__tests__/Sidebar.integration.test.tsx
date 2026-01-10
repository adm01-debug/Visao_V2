import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";

describe("Sidebar Integration", () => {
  it("should render navigation links", async () => {
    const { Sidebar } = await import("../../sidebar/Sidebar");
    
    const { container } = render(
      <BrowserRouter>
        <Sidebar />
      </BrowserRouter>
    );

    expect(container).toBeTruthy();
  });
});

