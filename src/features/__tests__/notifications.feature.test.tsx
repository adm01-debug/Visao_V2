import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

describe("Notifications Feature Integration", () => {
  it("should render notifications page", async () => {
    const Notifications = await import("../../pages/Notifications");
    
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Notifications.default />
        </BrowserRouter>
      </QueryClientProvider>
    );

    expect(container).toBeTruthy();
  });
});

