import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import FaceRecognitionPage from "../FaceRecognitionPage";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>{children}</BrowserRouter>
  </QueryClientProvider>
);

describe("FaceRecognitionPage Integration", () => {
  it("renders without crashing", () => {
    render(<FaceRecognitionPage />, { wrapper });
    expect(document.body).toBeTruthy();
  });
});

