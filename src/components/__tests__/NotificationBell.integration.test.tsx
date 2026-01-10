import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

describe("NotificationBell Integration", () => {
  it("should render notification bell", async () => {
    const { NotificationBell } = await import("../../NotificationBell");
    
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <NotificationBell />
      </QueryClientProvider>
    );

    expect(container).toBeTruthy();
  });
});

