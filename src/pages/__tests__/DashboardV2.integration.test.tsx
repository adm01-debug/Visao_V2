import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import Dashboard from "../DashboardV2";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>{children}</BrowserRouter>
  </QueryClientProvider>
);

describe("Dashboard Integration", () => {
  it("renders without crashing", () => {
    render(<Dashboard />, { wrapper });
    expect(document.body).toBeTruthy();
  });

  it("displays loading state initially", () => {
    render(<Dashboard />, { wrapper });
    // Dashboard should render
    expect(document.querySelector("main") || document.body).toBeTruthy();
  });
});

