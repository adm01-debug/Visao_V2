import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AlertsPage from "../AlertsPage";

const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: () => ({ select: () => ({ data: [], error: null }) }) }
}));

describe("AlertsPage", () => {
  it("renders", () => {
    render(
      <QueryClientProvider client={qc}>
        <BrowserRouter>
          <AlertsPage />
        </BrowserRouter>
      </QueryClientProvider>
    );
    expect(document.body).toBeTruthy();
  });
});
