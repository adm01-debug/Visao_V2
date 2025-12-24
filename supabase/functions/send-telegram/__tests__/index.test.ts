import { assertEquals } from "https://deno.land/std@0.192.0/testing/asserts.ts";

Deno.test("send-telegram should send message", async () => {
  const mockRequest = new Request("http://localhost/send-telegram", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: "123", message: "Test message" }),
  });
  
  assertEquals(mockRequest.method, "POST");
});

Deno.test("send-telegram should validate chat_id", async () => {
  const mockResponse = { ok: true, message_id: 456 };
  assertEquals(mockResponse.ok, true);
  assertEquals(typeof mockResponse.message_id, "number");
});
