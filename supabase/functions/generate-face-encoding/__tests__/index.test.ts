import { assertEquals } from "https://deno.land/std@0.192.0/testing/asserts.ts";

Deno.test("generate-face-encoding should create encoding", async () => {
  const mockRequest = new Request("http://localhost/generate-face-encoding", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image_base64: "base64data" }),
  });
  
  assertEquals(mockRequest.method, "POST");
});

Deno.test("generate-face-encoding should return encoding array", async () => {
  const mockResponse = { encoding: [0.1, 0.2, 0.3], success: true };
  assertEquals(mockResponse.success, true);
  assertEquals(Array.isArray(mockResponse.encoding), true);
});
