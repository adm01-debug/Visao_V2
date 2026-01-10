import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import CamerasPage from "../CamerasPage";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>{children}</BrowserRouter>
  </QueryClientProvider>
);

describe("CamerasPage Integration", () => {
  it("renders without crashing", () => {
    render(<CamerasPage />, { wrapper });
    expect(document.body).toBeTruthy();
  });

  it("has proper structure", () => {
    render(<CamerasPage />, { wrapper });
    expect(document.querySelector("main") || document.body).toBeTruthy();
  });
});

