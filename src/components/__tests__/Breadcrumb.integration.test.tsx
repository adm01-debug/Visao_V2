import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";

describe("Breadcrumb Integration", () => {
  it("should render breadcrumb", async () => {
    const Breadcrumb = await import("../ui/breadcrumb");
    
    const { container } = render(
      <Breadcrumb.Breadcrumb>
        <Breadcrumb.BreadcrumbList>
          <Breadcrumb.BreadcrumbItem>
            <Breadcrumb.BreadcrumbLink href="/">Home</Breadcrumb.BreadcrumbLink>
          </Breadcrumb.BreadcrumbItem>
        </Breadcrumb.BreadcrumbList>
      </Breadcrumb.Breadcrumb>
    );

    expect(container).toBeTruthy();
  });
});

