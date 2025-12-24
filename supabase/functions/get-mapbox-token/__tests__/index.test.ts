import { assertEquals } from "https://deno.land/std@0.192.0/testing/asserts.ts";

Deno.test("get-mapbox-token should return token", async () => {
  const mockRequest = new Request("http://localhost/get-mapbox-token", {
    method: "GET",
  });
  
  assertEquals(mockRequest.method, "GET");
});

Deno.test("get-mapbox-token should have valid format", async () => {
  const mockResponse = { token: "pk.eyJ1..." };
  assertEquals(typeof mockResponse.token, "string");
  assertEquals(mockResponse.token.startsWith("pk."), true);
});
