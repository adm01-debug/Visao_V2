import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

describe("Export Feature Integration", () => {
  it("should render export page", async () => {
    const Export = await import("../../pages/Export");
    
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Export.default />
        </BrowserRouter>
      </QueryClientProvider>
    );

    expect(container).toBeTruthy();
  });
});

