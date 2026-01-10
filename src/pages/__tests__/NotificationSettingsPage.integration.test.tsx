import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import NotificationSettingsPage from "../NotificationSettingsPage";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>{children}</BrowserRouter>
  </QueryClientProvider>
);

describe("NotificationSettingsPage Integration", () => {
  it("renders without crashing", () => {
    render(<NotificationSettingsPage />, { wrapper });
    expect(document.body).toBeTruthy();
  });
});

