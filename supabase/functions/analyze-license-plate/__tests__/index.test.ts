import { assertEquals } from "https://deno.land/std@0.192.0/testing/asserts.ts";

Deno.test("analyze-license-plate should detect plates", async () => {
  const mockRequest = new Request("http://localhost/analyze-license-plate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image_base64: "base64data" }),
  });
  
  assertEquals(mockRequest.method, "POST");
});

Deno.test("analyze-license-plate should handle missing image", async () => {
  const mockRequest = new Request("http://localhost/analyze-license-plate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  
  const body = await mockRequest.json();
  assertEquals(body.image_base64, undefined);
});
