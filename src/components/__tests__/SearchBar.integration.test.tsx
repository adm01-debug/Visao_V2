import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";

describe("SearchBar Integration", () => {
  it("should render search bar", async () => {
    const { SearchBar } = await import("../../SearchBar");
    
    const { container } = render(
      <SearchBar onSearch={() => {}} />
    );

    expect(container.querySelector("input")).toBeTruthy();
  });
});

