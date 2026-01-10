import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

describe("Users Feature Integration", () => {
  it("should render users page", async () => {
    const Users = await import("../../pages/Users");
    
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Users.default />
        </BrowserRouter>
      </QueryClientProvider>
    );

    expect(container).toBeTruthy();
  });
});

