/**
 * VISÃO — Unified Contract Validation (Onda webhook-edge-functions-schema).
 *
 * Provides:
 *  - Standard 422 response format: { code, message, fields[], contract_version }
 *  - Version-aware parsing with v1/v2 backward compatibility
 *  - JSON body parsing with size guards
 *
 * ## 422 Response format (all validation failures)
 * {
 *   code: "VALIDATION_ERROR",
 *   message: string,
 *   fields: Array<{ field: string, message: string, received?: unknown }>,
 *   contract_version: "v1" | "v2"
 * }
 */
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";

export const CONTRACT_VERSIONS = ["v1", "v2"] as const;
export type ContractVersion = typeof CONTRACT_VERSIONS[number];

export interface FieldError {
  field: string;
  message: string;
  received?: unknown;
}

export interface ValidationErrorBody {
  code: "VALIDATION_ERROR";
  message: string;
  fields: FieldError[];
  contract_version: ContractVersion;
}

/** Extract contract version from request headers (X-Api-Version or X-Contract-Version). */
export function getContractVersion(req: Request): ContractVersion {
  const header =
    req.headers.get("x-api-version") ?? req.headers.get("x-contract-version") ?? "";
  if (header === "v2" || header === "2") return "v2";
  return "v1";
}

/** Convert Zod issues to our unified FieldError format. */
function zodIssuesToFields(error: z.ZodError, includeReceived = false): FieldError[] {
  return error.issues.map((issue) => {
    const field = issue.path.length > 0 ? issue.path.join(".") : "(root)";
    const fe: FieldError = { field, message: issue.message };
    if (includeReceived && issue.code === "invalid_type") {
      fe.received = (issue as z.ZodInvalidTypeIssue).received;
    }
    return fe;
  });
}

/** Build a standard 422 Unprocessable Entity response. */
export function validationError422(
  message: string,
  fields: FieldError[],
  cors: Record<string, string> = {},
  version: ContractVersion = "v1",
): Response {
  const body: ValidationErrorBody = {
    code: "VALIDATION_ERROR",
    message,
    fields,
    contract_version: version,
  };
  return new Response(JSON.stringify(body), {
    status: 422,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

/**
 * Validate `data` against `schema`.
 * Returns the typed value or a 422 Response with unified error format.
 *
 * v2 responses include the `received` type in each FieldError.
 */
export function validatePayload<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  cors: Record<string, string> = {},
  version: ContractVersion = "v1",
): { success: true; data: T } | { success: false; response: Response } {
  const result = schema.safeParse(data);
  if (result.success) return { success: true, data: result.data };

  const fields = zodIssuesToFields(result.error, version === "v2");
  return {
    success: false,
    response: validationError422("Payload inválido", fields, cors, version),
  };
}

/** Schema pair for versioned endpoints. v2 must be a superset of v1. */
export interface VersionedSchemas<T1, T2 extends T1> {
  v1: z.ZodSchema<T1>;
  v2: z.ZodSchema<T2>;
}

/**
 * Validate a payload against the correct versioned schema.
 *
 * Backward compatibility: if v2 validation fails but v1 succeeds,
 * the request is accepted as a v1 payload (additive versioning guarantee).
 *
 * A v1 payload submitted to a v2 endpoint will succeed (leniency on upgrade).
 * A v2 payload submitted to a v1 endpoint will fail if it has unknown fields
 * and the v1 schema is strict.
 */
export function validateVersionedPayload<T1, T2 extends T1>(
  schemas: VersionedSchemas<T1, T2>,
  data: unknown,
  version: ContractVersion,
  cors: Record<string, string> = {},
): { success: true; data: T1 | T2; version: ContractVersion } | { success: false; response: Response } {
  const schema = version === "v2" ? schemas.v2 : schemas.v1;
  const result = (schema as z.ZodSchema<T1 | T2>).safeParse(data);

  if (result.success) return { success: true, data: result.data, version };

  if (version === "v2") {
    const v1Result = schemas.v1.safeParse(data);
    if (v1Result.success) {
      // Backward compat: v2 client sent a v1 payload — accept it.
      return { success: true, data: v1Result.data, version: "v1" };
    }
  }

  const fields = zodIssuesToFields(result.error, version === "v2");
  return {
    success: false,
    response: validationError422("Payload inválido", fields, cors, version),
  };
}

/**
 * Parse the JSON body of a request with a size guard.
 * Returns parsed data or an error Response (400/413).
 */
export async function parseJsonBody(
  req: Request,
  maxBytes = 100_000,
  cors: Record<string, string> = {},
): Promise<{ success: true; data: unknown } | { success: false; response: Response }> {
  const cl = Number(req.headers.get("content-length") ?? "0");
  if (cl > maxBytes) {
    return {
      success: false,
      response: new Response(
        JSON.stringify({ code: "PAYLOAD_TOO_LARGE", message: `Body excede ${maxBytes} bytes` }),
        { status: 413, headers: { ...cors, "Content-Type": "application/json" } },
      ),
    };
  }

  let text: string;
  try {
    text = await req.text();
  } catch {
    return {
      success: false,
      response: new Response(
        JSON.stringify({ code: "READ_ERROR", message: "Não foi possível ler o corpo da requisição" }),
        { status: 400, headers: { ...cors, "Content-Type": "application/json" } },
      ),
    };
  }

  if (text.length > maxBytes) {
    return {
      success: false,
      response: new Response(
        JSON.stringify({ code: "PAYLOAD_TOO_LARGE", message: `Body excede ${maxBytes} bytes` }),
        { status: 413, headers: { ...cors, "Content-Type": "application/json" } },
      ),
    };
  }

  if (!text.trim()) {
    return { success: true, data: null };
  }

  try {
    const data = JSON.parse(text);
    return { success: true, data };
  } catch {
    return {
      success: false,
      response: new Response(
        JSON.stringify({ code: "INVALID_JSON", message: "Corpo da requisição não é JSON válido" }),
        { status: 400, headers: { ...cors, "Content-Type": "application/json" } },
      ),
    };
  }
}

/**
 * Combine parseJsonBody + validatePayload in one call.
 * Returns typed data or an error Response.
 */
export async function parseAndValidate<T>(
  req: Request,
  schema: z.ZodSchema<T>,
  opts: {
    cors?: Record<string, string>;
    maxBytes?: number;
    version?: ContractVersion;
  } = {},
): Promise<{ success: true; data: T } | { success: false; response: Response }> {
  const { cors = {}, maxBytes = 100_000, version = "v1" } = opts;

  const bodyResult = await parseJsonBody(req, maxBytes, cors);
  if (!bodyResult.success) return bodyResult;

  return validatePayload(schema, bodyResult.data, cors, version);
}
