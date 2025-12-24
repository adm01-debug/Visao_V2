import { setupWorker } from "msw/browser";
import { handlers } from "./handlers";

export const worker = setupWorker(...handlers);

export const startMockServiceWorker = async () => {
  if (import.meta.env.DEV && import.meta.env.VITE_ENABLE_MSW === "true") {
    await worker.start({
      onUnhandledRequest: "bypass",
    });
    console.log("[MSW] Mock Service Worker started");
  }
};

export default worker;
