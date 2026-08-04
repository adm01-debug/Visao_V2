/**
 * Unit tests for contractValidation.ts utilities.
 * Tests the unified 422 response format, version detection, and versioned validation.
 */
import {
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import {
  getContractVersion,
  parseAndValidate,
  parseJsonBody,
  validatePayload,
  validateVersionedPayload,
  validationError422,
} from "../contractValidation.ts";

// ─────────────────────────────────────────────────────────────
// getContractVersion
// ─────────────────────────────────────────────────────────────

Deno.test("getContractVersion retorna v1 por padrão quando não há header", () => {
  const req = new Request("http://example.com", { method: "POST" });
  assertEquals(getContractVersion(req), "v1");
});

Deno.test("getContractVersion retorna v2 via x-api-version: v2", () => {
  const req = new Request("http://example.com", {
    method: "POST",
    headers: { "x-api-version": "v2" },
  });
  assertEquals(getContractVersion(req), "v2");
});

Deno.test("getContractVersion retorna v2 via x-api-version: 2", () => {
  const req = new Request("http://example.com", {
    method: "POST",
    headers: { "x-api-version": "2" },
  });
  assertEquals(getContractVersion(req), "v2");
});

Deno.test("getContractVersion retorna v2 via x-contract-version: v2", () => {
  const req = new Request("http://example.com", {
    method: "POST",
    headers: { "x-contract-version": "v2" },
  });
  assertEquals(getContractVersion(req), "v2");
});

Deno.test("getContractVersion retorna v1 para valor desconhecido", () => {
  const req = new Request("http://example.com", {
    method: "POST",
    headers: { "x-api-version": "v3" },
  });
  assertEquals(getContractVersion(req), "v1");
});

// Case-insensitivity fixes (CV-002: uppercase V2 was silently downgraded to v1)
Deno.test("getContractVersion aceita V2 maiúsculo via x-api-version", () => {
  const req = new Request("http://example.com", {
    method: "POST",
    headers: { "x-api-version": "V2" },
  });
  assertEquals(getContractVersion(req), "v2");
});

Deno.test("getContractVersion aceita V2 maiúsculo via x-contract-version", () => {
  const req = new Request("http://example.com", {
    method: "POST",
    headers: { "x-contract-version": "V2" },
  });
  assertEquals(getContractVersion(req), "v2");
});

// Whitespace tolerance (CV-013: trailing spaces from proxies)
Deno.test("getContractVersion tolera espaços em torno do valor do header", () => {
  const req = new Request("http://example.com", {
    method: "POST",
    headers: { "x-api-version": "  v2  " },
  });
  assertEquals(getContractVersion(req), "v2");
});

// Precedence: x-api-version with non-empty value overrides x-contract-version
Deno.test("getContractVersion usa x-api-version quando ambos headers estão presentes", () => {
  const req = new Request("http://example.com", {
    method: "POST",
    headers: { "x-api-version": "v1", "x-contract-version": "v2" },
  });
  assertEquals(getContractVersion(req), "v1");
});

Deno.test("getContractVersion usa x-contract-version quando x-api-version está vazio", () => {
  const req = new Request("http://example.com", {
    method: "POST",
    headers: { "x-api-version": "", "x-contract-version": "v2" },
  });
  assertEquals(getContractVersion(req), "v2");
});

// ─────────────────────────────────────────────────────────────
// validationError422
// ─────────────────────────────────────────────────────────────

Deno.test("validationError422 retorna status 422", async () => {
  const res = validationError422("Payload inválido", []);
  assertEquals(res.status, 422);
});

Deno.test("validationError422 retorna Content-Type application/json", async () => {
  const res = validationError422("Erro", []);
  assertEquals(res.headers.get("content-type"), "application/json");
});

Deno.test("validationError422 body tem shape correto", async () => {
  const fields = [{ field: "nome", message: "obrigatório" }];
  const res = validationError422("Payload inválido", fields, {}, "v1");
  const body = await res.json();
  assertEquals(body.code, "VALIDATION_ERROR");
  assertEquals(body.message, "Payload inválido");
  assertEquals(body.contract_version, "v1");
  assertEquals(body.fields.length, 1);
  assertEquals(body.fields[0].field, "nome");
  assertEquals(body.fields[0].message, "obrigatório");
});

Deno.test("validationError422 propaga versão v2 no body", async () => {
  const res = validationError422("Erro", [], {}, "v2");
  const body = await res.json();
  assertEquals(body.contract_version, "v2");
});

Deno.test("validationError422 inclui CORS headers quando fornecidos", () => {
  const cors = { "Access-Control-Allow-Origin": "*" };
  const res = validationError422("Erro", [], cors);
  assertEquals(res.headers.get("access-control-allow-origin"), "*");
});

Deno.test("validationError422 Content-Type não é duplicado por CORS header", () => {
  // If CORS object contains content-type, it must not appear twice.
  const cors = { "Access-Control-Allow-Origin": "*" };
  const res = validationError422("Erro", [], cors);
  // Headers API deduplicates — just verify it's set once and correct.
  assertEquals(res.headers.get("content-type"), "application/json");
});

// ─────────────────────────────────────────────────────────────
// validatePayload
// ─────────────────────────────────────────────────────────────

const SimpleSchema = z.object({
  name: z.string().min(1),
  age: z.number().int().min(0),
}).strict();

Deno.test("validatePayload retorna success:true para payload válido", () => {
  const result = validatePayload(SimpleSchema, { name: "Ana", age: 30 });
  assertEquals(result.success, true);
  if (result.success) {
    assertEquals(result.data.name, "Ana");
    assertEquals(result.data.age, 30);
  }
});

Deno.test("validatePayload retorna success:false para campo ausente", async () => {
  const result = validatePayload(SimpleSchema, { name: "Ana" });
  assertEquals(result.success, false);
  if (!result.success) {
    assertEquals(result.response.status, 422);
    const body = await result.response.json();
    assertEquals(body.code, "VALIDATION_ERROR");
    assertEquals(body.fields.some((f: { field: string }) => f.field === "age"), true);
  }
});

Deno.test("validatePayload retorna success:false para tipo incorreto", async () => {
  const result = validatePayload(SimpleSchema, { name: "Ana", age: "trinta" });
  assertEquals(result.success, false);
  if (!result.success) {
    const body = await result.response.json();
    assertEquals(body.fields.some((f: { field: string }) => f.field === "age"), true);
  }
});

Deno.test("validatePayload retorna success:false para string vazia em campo required", async () => {
  const result = validatePayload(SimpleSchema, { name: "", age: 30 });
  assertEquals(result.success, false);
  if (!result.success) {
    const body = await result.response.json();
    assertEquals(body.fields.some((f: { field: string }) => f.field === "name"), true);
  }
});

Deno.test("validatePayload retorna success:false para campo extra em strict schema", async () => {
  const result = validatePayload(SimpleSchema, { name: "Ana", age: 30, extra: "x" });
  assertEquals(result.success, false);
  if (!result.success) {
    assertEquals(result.response.status, 422);
  }
});

Deno.test("validatePayload v2 inclui received para invalid_type", async () => {
  const result = validatePayload(SimpleSchema, { name: "Ana", age: "nao-numero" }, {}, "v2");
  assertEquals(result.success, false);
  if (!result.success) {
    const body = await result.response.json();
    const ageField = body.fields.find((f: { field: string }) => f.field === "age");
    assertExists(ageField);
    assertExists(ageField.received);
    assertEquals(ageField.received, "string"); // ZodInvalidTypeIssue.received is the JS type name
  }
});

Deno.test("validatePayload v2 inclui received para invalid_enum_value", async () => {
  const EnumSchema = z.object({ status: z.enum(["active", "inactive"]) }).strict();
  const result = validatePayload(EnumSchema, { status: "unknown" }, {}, "v2");
  assertEquals(result.success, false);
  if (!result.success) {
    const body = await result.response.json();
    const field = body.fields.find((f: { field: string }) => f.field === "status");
    assertExists(field);
    assertExists(field.received); // received = "unknown" for invalid_enum_value
  }
});

Deno.test("validatePayload v1 não inclui received", async () => {
  const result = validatePayload(SimpleSchema, { name: "Ana", age: "nao-numero" }, {}, "v1");
  assertEquals(result.success, false);
  if (!result.success) {
    const body = await result.response.json();
    const ageField = body.fields.find((f: { field: string }) => f.field === "age");
    assertExists(ageField);
    assertEquals(ageField.received, undefined);
  }
});

Deno.test("validatePayload retorna success:false para null", async () => {
  const result = validatePayload(SimpleSchema, null);
  assertEquals(result.success, false);
  if (!result.success) {
    assertEquals(result.response.status, 422);
    const body = await result.response.json();
    assertEquals(body.code, "VALIDATION_ERROR");
  }
});

Deno.test("validatePayload retorna success:false para undefined", async () => {
  const result = validatePayload(SimpleSchema, undefined);
  assertEquals(result.success, false);
  if (!result.success) {
    assertEquals(result.response.status, 422);
  }
});

// ─────────────────────────────────────────────────────────────
// validateVersionedPayload
// ─────────────────────────────────────────────────────────────

const SchemaV1 = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
}).strict();

const SchemaV2 = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  tags: z.array(z.string()).optional(),
}).strict();

const schemas = { v1: SchemaV1, v2: SchemaV2 };

Deno.test("validateVersionedPayload aceita payload v1 em contrato v1", () => {
  const data = { id: "550e8400-e29b-41d4-a716-446655440000", name: "Test" };
  const result = validateVersionedPayload(schemas, data, "v1");
  assertEquals(result.success, true);
  if (result.success) {
    assertEquals(result.version, "v1");
  }
});

Deno.test("validateVersionedPayload aceita payload v2 em contrato v2", () => {
  const data = {
    id: "550e8400-e29b-41d4-a716-446655440000",
    name: "Test",
    tags: ["a", "b"],
  };
  const result = validateVersionedPayload(schemas, data, "v2");
  assertEquals(result.success, true);
  if (result.success) {
    assertEquals(result.version, "v2");
  }
});

Deno.test("validateVersionedPayload aceita payload v1 em contrato v2 (backward compat)", () => {
  const data = { id: "550e8400-e29b-41d4-a716-446655440000", name: "Test" };
  const result = validateVersionedPayload(schemas, data, "v2");
  assertEquals(result.success, true);
  if (result.success) assertEquals(result.version, "v1");
});

Deno.test("validateVersionedPayload rejeita payload inválido em v1", async () => {
  const data = { id: "nao-uuid", name: "Test" };
  const result = validateVersionedPayload(schemas, data, "v1");
  assertEquals(result.success, false);
  if (!result.success) {
    assertEquals(result.response.status, 422);
    const body = await result.response.json();
    assertEquals(body.code, "VALIDATION_ERROR");
    assertEquals(body.fields.some((f: { field: string }) => f.field === "id"), true);
  }
});

Deno.test("validateVersionedPayload rejeita payload inválido em v2 quando fallback v1 também falha", async () => {
  const data = { name: "Sem ID" };
  const result = validateVersionedPayload(schemas, data, "v2");
  assertEquals(result.success, false);
  if (!result.success) {
    assertEquals(result.response.status, 422);
    const body = await result.response.json();
    assertEquals(body.contract_version, "v2");
  }
});

Deno.test("validateVersionedPayload v1 rejeita campo extra (strict)", async () => {
  const data = {
    id: "550e8400-e29b-41d4-a716-446655440000",
    name: "Test",
    extra: "campo-nao-permitido",
  };
  const result = validateVersionedPayload(schemas, data, "v1");
  assertEquals(result.success, false);
});

// ─────────────────────────────────────────────────────────────
// parseJsonBody
// ─────────────────────────────────────────────────────────────

Deno.test("parseJsonBody retorna dados de JSON válido", async () => {
  const req = new Request("http://example.com", {
    method: "POST",
    body: JSON.stringify({ key: "value" }),
    headers: { "content-type": "application/json" },
  });
  const result = await parseJsonBody(req);
  assertEquals(result.success, true);
  if (result.success) {
    assertEquals((result.data as Record<string, unknown>).key, "value");
  }
});

Deno.test("parseJsonBody retorna null para body vazio", async () => {
  const req = new Request("http://example.com", {
    method: "POST",
    body: "",
    headers: { "content-type": "application/json" },
  });
  const result = await parseJsonBody(req);
  assertEquals(result.success, true);
  if (result.success) {
    assertEquals(result.data, null);
  }
});

Deno.test("parseJsonBody retorna null para body de apenas whitespace", async () => {
  const req = new Request("http://example.com", {
    method: "POST",
    body: "   \t\n  ",
    headers: { "content-type": "application/json" },
  });
  const result = await parseJsonBody(req);
  assertEquals(result.success, true);
  if (result.success) {
    assertEquals(result.data, null);
  }
});

Deno.test("parseJsonBody retorna 400 para JSON inválido", async () => {
  const req = new Request("http://example.com", {
    method: "POST",
    body: "{ invalid json }",
    headers: { "content-type": "application/json" },
  });
  const result = await parseJsonBody(req);
  assertEquals(result.success, false);
  if (!result.success) {
    assertEquals(result.response.status, 400);
    const body = await result.response.json();
    assertEquals(body.code, "INVALID_JSON");
  }
});

Deno.test("parseJsonBody retorna 413 quando Content-Length excede maxBytes", async () => {
  const req = new Request("http://example.com", {
    method: "POST",
    body: "x".repeat(50),
    headers: {
      "content-type": "application/json",
      "content-length": "200",
    },
  });
  const result = await parseJsonBody(req, 100);
  assertEquals(result.success, false);
  if (!result.success) {
    assertEquals(result.response.status, 413);
    const body = await result.response.json();
    assertEquals(body.code, "PAYLOAD_TOO_LARGE");
  }
});

Deno.test("parseJsonBody retorna 413 quando body real excede maxBytes sem Content-Length", async () => {
  // Body is 120 bytes but no content-length header — second-stage byte check must fire.
  const bigBody = JSON.stringify({ data: "x".repeat(110) });
  const req = new Request("http://example.com", {
    method: "POST",
    body: bigBody,
    headers: { "content-type": "application/json" },
  });
  const result = await parseJsonBody(req, 50);
  assertEquals(result.success, false);
  if (!result.success) {
    assertEquals(result.response.status, 413);
  }
});

Deno.test("parseJsonBody rejeita emoji que ultrapassa maxBytes em bytes (CV-003)", async () => {
  // Each emoji is 4 bytes in UTF-8 but only 2 code units in JS string.length.
  // 30 emoji = 120 UTF-8 bytes, but string.length = 60 → old check would pass at limit 100.
  const emojiBody = JSON.stringify({ d: "🎉".repeat(30) });
  // Unconditionally assert the body is large enough so this test is never vacuous.
  const byteLen = new TextEncoder().encode(emojiBody).length;
  assert(byteLen > 100, `Emoji body deve ter > 100 bytes, mas tem ${byteLen}`);
  const req = new Request("http://example.com", {
    method: "POST",
    body: emojiBody,
    headers: { "content-type": "application/json" },
  });
  const result = await parseJsonBody(req, 100);
  assertEquals(result.success, false);
  if (!result.success) {
    assertEquals(result.response.status, 413);
  }
});

Deno.test("parseJsonBody aceita arrays JSON", async () => {
  const req = new Request("http://example.com", {
    method: "POST",
    body: JSON.stringify([{ type: "csp-violation", body: {} }]),
    headers: { "content-type": "application/json" },
  });
  const result = await parseJsonBody(req);
  assertEquals(result.success, true);
  if (result.success) {
    assertEquals(Array.isArray(result.data), true);
  }
});

Deno.test("parseJsonBody Content-Length: 0 sem body não passa limite alto", async () => {
  // Content-Length: 0 should NOT bypass the byte check for a non-empty body.
  const req = new Request("http://example.com", {
    method: "POST",
    body: "{}",
    headers: { "content-type": "application/json", "content-length": "0" },
  });
  const result = await parseJsonBody(req, 1_000);
  // Body is "{}": 2 bytes, well within limit. Should succeed.
  assertEquals(result.success, true);
});

Deno.test("parseJsonBody rejeita body real grande mesmo com Content-Length: 0 (CV-spoofed)", async () => {
  // A client that spoofs Content-Length: 0 to bypass the header fast-path
  // must still be caught by the byte-accurate second check.
  const bigBody = JSON.stringify({ data: "x".repeat(200) });
  const req = new Request("http://example.com", {
    method: "POST",
    body: bigBody,
    headers: { "content-type": "application/json", "content-length": "0" },
  });
  const result = await parseJsonBody(req, 50);
  assertEquals(result.success, false);
  if (!result.success) assertEquals(result.response.status, 413);
});

// ─────────────────────────────────────────────────────────────
// parseAndValidate
// ─────────────────────────────────────────────────────────────

Deno.test("parseAndValidate retorna dados válidos", async () => {
  const req = new Request("http://example.com", {
    method: "POST",
    body: JSON.stringify({ name: "Teste", age: 25 }),
    headers: { "content-type": "application/json" },
  });
  const result = await parseAndValidate(req, SimpleSchema);
  assertEquals(result.success, true);
  if (result.success) {
    assertEquals(result.data.name, "Teste");
  }
});

Deno.test("parseAndValidate retorna 422 para payload com campo inválido", async () => {
  const req = new Request("http://example.com", {
    method: "POST",
    body: JSON.stringify({ name: "Teste", age: -1 }),
    headers: { "content-type": "application/json" },
  });
  const result = await parseAndValidate(req, SimpleSchema);
  assertEquals(result.success, false);
  if (!result.success) {
    assertEquals(result.response.status, 422);
  }
});

Deno.test("parseAndValidate retorna 400 para JSON inválido", async () => {
  const req = new Request("http://example.com", {
    method: "POST",
    body: "not-json",
    headers: { "content-type": "application/json" },
  });
  const result = await parseAndValidate(req, SimpleSchema);
  assertEquals(result.success, false);
  if (!result.success) {
    assertEquals(result.response.status, 400);
  }
});

Deno.test("parseAndValidate propaga versão v2 quando passada explicitamente", async () => {
  const req = new Request("http://example.com", {
    method: "POST",
    body: JSON.stringify({ name: "Teste", age: "errado" }),
    headers: { "content-type": "application/json" },
  });
  const result = await parseAndValidate(req, SimpleSchema, { version: "v2" });
  assertEquals(result.success, false);
  if (!result.success) {
    const body = await result.response.json();
    assertEquals(body.contract_version, "v2");
    const ageField = body.fields.find((f: { field: string }) => f.field === "age");
    assertExists(ageField.received);
  }
});

Deno.test("parseAndValidate lê versão de x-api-version quando opts.version não é fornecido (CV-004)", async () => {
  // Critical fix: parseAndValidate must read X-Api-Version from headers automatically.
  const req = new Request("http://example.com", {
    method: "POST",
    body: JSON.stringify({ name: "Teste", age: "errado" }),
    headers: { "content-type": "application/json", "x-api-version": "v2" },
  });
  const result = await parseAndValidate(req, SimpleSchema);
  assertEquals(result.success, false);
  if (!result.success) {
    const body = await result.response.json();
    // Must pick up v2 from the request header.
    assertEquals(body.contract_version, "v2");
  }
});
