import { http, HttpResponse } from "msw";

export const handlers = [
  // Auth handlers
  http.post("/api/auth/login", async ({ request }) => {
    const body = await request.json() as { email: string; password: string };
    if (body.email === "test@test.com" && body.password === "password") {
      return HttpResponse.json({
        user: { id: "1", email: body.email, name: "Test User" },
        token: "mock-token",
      });
    }
    return HttpResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }),

  // Cameras handlers
  http.get("/api/cameras", () => {
    return HttpResponse.json([
      { id: "1", name: "Camera 1", status: "online", streamUrl: "rtsp://..." },
      { id: "2", name: "Camera 2", status: "offline", streamUrl: "rtsp://..." },
    ]);
  }),

  // Alerts handlers
  http.get("/api/alerts", () => {
    return HttpResponse.json([
      { id: "1", type: "motion", message: "Motion detected", cameraId: "1", timestamp: new Date().toISOString() },
    ]);
  }),

  // Analytics handlers
  http.get("/api/analytics", () => {
    return HttpResponse.json({
      totalAlerts: 150,
      camerasOnline: 8,
      camerasOffline: 2,
      recognitions: 45,
    });
  }),
];

export default handlers;
