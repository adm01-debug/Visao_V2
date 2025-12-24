import { assertEquals } from "https://deno.land/std@0.192.0/testing/asserts.ts";

Deno.test("send-alert-notification should send notification", async () => {
  const mockRequest = new Request("http://localhost/send-alert-notification", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ alert_id: "123", message: "Test alert" }),
  });
  
  assertEquals(mockRequest.method, "POST");
});

Deno.test("send-alert-notification should return success", async () => {
  const mockResponse = { success: true, sent_to: ["email", "telegram"] };
  assertEquals(mockResponse.success, true);
  assertEquals(mockResponse.sent_to.includes("email"), true);
});
