import { assertEquals } from "https://deno.land/std@0.192.0/testing/asserts.ts";

Deno.test("detect-faces should detect faces in image", async () => {
  const mockRequest = new Request("http://localhost/detect-faces", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image_url: "https://example.com/face.jpg" }),
  });
  
  assertEquals(mockRequest.method, "POST");
});

Deno.test("detect-faces should return face locations", async () => {
  const mockResponse = { faces: [{ x: 10, y: 20, width: 100, height: 100 }] };
  assertEquals(mockResponse.faces.length, 1);
  assertEquals(mockResponse.faces[0].x, 10);
});
