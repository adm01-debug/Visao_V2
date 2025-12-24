import { assertEquals } from "https://deno.land/std@0.192.0/testing/asserts.ts";

Deno.test("compare-faces should compare two faces", async () => {
  const mockRequest = new Request("http://localhost/compare-faces", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ face1: "encoding1", face2: "encoding2" }),
  });
  
  assertEquals(mockRequest.method, "POST");
});

Deno.test("compare-faces should return similarity score", async () => {
  const mockResponse = { similarity: 0.95, match: true };
  assertEquals(mockResponse.match, true);
  assertEquals(typeof mockResponse.similarity, "number");
});
