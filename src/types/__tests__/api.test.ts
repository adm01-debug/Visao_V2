import { describe, it, expectTypeOf } from "vitest";
import type { ApiResponse, PaginatedResponse, ApiError, HttpMethod } from "../api";

describe("API Types", () => {
  it("ApiResponse should have correct shape", () => {
    const response: ApiResponse<string> = { data: "test", error: null, status: 200 };
    expectTypeOf(response.data).toEqualTypeOf<string | null>();
    expectTypeOf(response.error).toEqualTypeOf<string | null>();
    expectTypeOf(response.status).toEqualTypeOf<number>();
  });

  it("PaginatedResponse should have pagination fields", () => {
    const response: PaginatedResponse<{ id: string }> = {
      data: [{ id: "1" }], total: 1, page: 1, pageSize: 10, totalPages: 1
    };
    expectTypeOf(response.data).toBeArray();
    expectTypeOf(response.total).toBeNumber();
  });

  it("HttpMethod should be union type", () => {
    const method: HttpMethod = "GET";
    expectTypeOf(method).toEqualTypeOf<"GET" | "POST" | "PUT" | "PATCH" | "DELETE">();
  });
});
