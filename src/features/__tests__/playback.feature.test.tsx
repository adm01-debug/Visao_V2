import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

describe("Playback Feature Integration", () => {
  it("should render playback page", async () => {
    const Playback = await import("../../pages/Playback");
    
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Playback.default />
        </BrowserRouter>
      </QueryClientProvider>
    );

    expect(container).toBeTruthy();
  });
});

