import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import SettingsPage from "../SettingsPage";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>{children}</BrowserRouter>
  </QueryClientProvider>
);

describe("SettingsPage Integration", () => {
  it("renders without crashing", () => {
    render(<SettingsPage />, { wrapper });
    expect(document.body).toBeTruthy();
  });
});

