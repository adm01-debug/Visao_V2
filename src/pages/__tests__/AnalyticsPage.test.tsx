import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AnalyticsPage from "../AnalyticsPage";

const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: () => ({ select: () => ({ data: [], error: null }) }) }
}));

describe("AnalyticsPage", () => {
  it("renders", () => {
    render(
      <QueryClientProvider client={qc}>
        <BrowserRouter>
          <AnalyticsPage />
        </BrowserRouter>
      </QueryClientProvider>
    );
    expect(document.body).toBeTruthy();
  });
});
