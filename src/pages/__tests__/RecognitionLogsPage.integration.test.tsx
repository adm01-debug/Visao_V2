import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import RecognitionLogsPage from "../RecognitionLogsPage";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>{children}</BrowserRouter>
  </QueryClientProvider>
);

describe("RecognitionLogsPage Integration", () => {
  it("renders without crashing", () => {
    render(<RecognitionLogsPage />, { wrapper });
    expect(document.body).toBeTruthy();
  });
});

