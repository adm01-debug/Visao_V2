import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

describe("Integrations Feature Integration", () => {
  it("should render integrations page", async () => {
    const Integrations = await import("../../pages/Integrations");
    
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Integrations.default />
        </BrowserRouter>
      </QueryClientProvider>
    );

    expect(container).toBeTruthy();
  });
});

