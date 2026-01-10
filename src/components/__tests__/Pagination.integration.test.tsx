import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";

describe("Pagination Integration", () => {
  it("should render pagination", async () => {
    const Pagination = await import("../ui/pagination");
    
    const { container } = render(
      <Pagination.Pagination>
        <Pagination.PaginationContent>
          <Pagination.PaginationItem>
            <Pagination.PaginationPrevious href="#" />
          </Pagination.PaginationItem>
        </Pagination.PaginationContent>
      </Pagination.Pagination>
    );

    expect(container).toBeTruthy();
  });
});

