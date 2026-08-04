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

Deno.test("validatePayload v2 inclui received no campo de erro", async () => {
  const result = validatePayload(SimpleSchema, { name: "Ana", age: "nao-numero" }, {}, "v2");
  assertEquals(result.success, false);
  if (!result.success) {
    const body = await result.response.json();
    const ageField = body.fields.find((f: { field: string }) => f.field === "age");
    assertExists(ageField);
    assertExists(ageField.received);
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
});

Deno.test("validatePayload retorna success:false para undefined", async () => {
  const result = validatePayload(SimpleSchema, undefined);
  assertEquals(result.success, false);
});

// ─────────────────────────────────────────────────────────────
// validateVersionedPayload
// ─────────────────────────────────────────────────────────────

const SchemaV1 = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
}).strict();

const SchemaV2 = SchemaV1.omit({}).extend({
  tags: z.array(z.string()).optional(),
});

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
  // v1 payload (sem tags) enviado para endpoint v2 → deve ser aceito como v1
  const data = { id: "550e8400-e29b-41d4-a716-446655440000", name: "Test" };
  const result = validateVersionedPayload(schemas, data, "v2");
  // v2 extends v1, so v1 payload is also valid v2 (tags is optional)
  assertEquals(result.success, true);
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

Deno.test("validateVersionedPayload rejeita payload inválido em v2 com fallback v1 também falha", async () => {
  const data = { name: "Sem ID" };
  const result = validateVersionedPayload(schemas, data, "v2");
  assertEquals(result.success, false);
  if (!result.success) {
    assertEquals(result.response.status, 422);
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

Deno.test("parseJsonBody retorna 413 quando body excede maxBytes (content-length)", async () => {
  const bigPayload = "x".repeat(100);
  const req = new Request("http://example.com", {
    method: "POST",
    body: bigPayload,
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

Deno.test("parseAndValidate propaga versão v2 corretamente", async () => {
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
    // v2 deve incluir received
    const ageField = body.fields.find((f: { field: string }) => f.field === "age");
    assertExists(ageField.received);
  }
});
