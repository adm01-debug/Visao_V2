import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

describe("AlertCard Integration", () => {
  it("should render alert card", async () => {
    const { AlertCard } = await import("../../AlertCard");
    
    const mockAlert = {
      id: "1",
      type: "motion",
      message: "Motion detected",
      created_at: new Date().toISOString(),
    };

    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <AlertCard alert={mockAlert} />
      </QueryClientProvider>
    );

    expect(container).toBeTruthy();
  });
});

