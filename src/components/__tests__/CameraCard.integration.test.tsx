import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

describe("CameraCard Integration", () => {
  it("should render camera card", async () => {
    const { CameraCard } = await import("../../cameras/CameraCard");
    
    const mockCamera = {
      id: "1",
      name: "Camera Test",
      url: "rtsp://test",
      status: "active",
    };

    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <CameraCard camera={mockCamera} />
      </QueryClientProvider>
    );

    expect(container).toBeTruthy();
  });
});

