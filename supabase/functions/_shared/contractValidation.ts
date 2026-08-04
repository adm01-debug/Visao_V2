/**
 * VISÃO — Unified Contract Validation (Onda webhook-edge-functions-schema).
 *
 * Provides:
 *  - Standard 422 response format: { code, message, fields[], contract_version }
 *  - Version-aware parsing with v1/v2 backward compatibility
 *  - JSON body parsing with size guards (byte-accurate via TextEncoder)
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

/**
 * Extract contract version from request headers (X-Api-Version or X-Contract-Version).
 * Case-insensitive and trims whitespace to tolerate proxy-mutated headers.
 * X-Api-Version takes precedence when both are present and non-empty.
 */
export function getContractVersion(req: Request): ContractVersion {
  const apiVer = (req.headers.get("x-api-version") ?? "").trim().toLowerCase();
  if (apiVer !== "") {
    return apiVer === "v2" || apiVer === "2" ? "v2" : "v1";
  }
  const contractVer = (req.headers.get("x-contract-version") ?? "").trim().toLowerCase();
  return contractVer === "v2" || contractVer === "2" ? "v2" : "v1";
}

/** Convert Zod issues to our unified FieldError format. */
function zodIssuesToFields(error: z.ZodError, includeReceived = false): FieldError[] {
  return error.issues.map((issue) => {
    const field = issue.path.length > 0 ? issue.path.map(String).join(".") : "(root)";
    const fe: FieldError = { field, message: issue.message };
    if (includeReceived) {
      if (issue.code === "invalid_type") {
        fe.received = (issue as z.ZodInvalidTypeIssue).received;
      } else if (issue.code === "invalid_enum_value") {
        fe.received = (issue as z.ZodInvalidEnumValueIssue).received;
      }
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
    headers: { "Content-Type": "application/json", ...cors },
  });
}

/**
 * Validate `data` against `schema`.
 * Returns the typed value or a 422 Response with unified error format.
 *
 * v2 responses include the `received` value in each FieldError.
 */
export function validatePayload<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  cors: Record<string, string> = {},
  version: ContractVersion = "v1",
): { success: true; data: T } | { success: false; response: Response } {
  let result: z.SafeParseReturnType<unknown, T>;
  try {
    result = schema.safeParse(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro interno na validação";
    return {
      success: false,
      response: validationError422(message, [], cors, version),
    };
  }
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
  let result: z.SafeParseReturnType<unknown, T1 | T2>;
  try {
    result = (schema as z.ZodSchema<T1 | T2>).safeParse(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro interno na validação";
    return { success: false, response: validationError422(message, [], cors, version) };
  }

  if (result.success) return { success: true, data: result.data, version };

  if (version === "v2") {
    let v1Result: z.SafeParseReturnType<unknown, T1>;
    try {
      v1Result = schemas.v1.safeParse(data);
    } catch {
      v1Result = { success: false, error: result.error };
    }
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
 * Parse the JSON body of a request with a byte-accurate size guard.
 * Returns parsed data or an error Response (400/413).
 *
 * Two-stage guard:
 *  1. Content-Length header (fast reject for honest clients)
 *  2. Actual byte length after reading (defense against spoofed headers)
 */
export async function parseJsonBody(
  req: Request,
  maxBytes = 100_000,
  cors: Record<string, string> = {},
): Promise<{ success: true; data: unknown } | { success: false; response: Response }> {
  const clHeader = req.headers.get("content-length");
  if (clHeader !== null) {
    const cl = Number(clHeader);
    if (!Number.isNaN(cl) && cl > maxBytes) {
      return {
        success: false,
        response: new Response(
          JSON.stringify({ code: "PAYLOAD_TOO_LARGE", message: `Body excede ${maxBytes} bytes` }),
          { status: 413, headers: { "Content-Type": "application/json", ...cors } },
        ),
      };
    }
  }

  let text: string;
  try {
    text = await req.text();
  } catch {
    return {
      success: false,
      response: new Response(
        JSON.stringify({ code: "READ_ERROR", message: "Não foi possível ler o corpo da requisição" }),
        { status: 400, headers: { "Content-Type": "application/json", ...cors } },
      ),
    };
  }

  // Byte-accurate check: text.length counts UTF-16 code units, not bytes.
  const byteLength = new TextEncoder().encode(text).length;
  if (byteLength > maxBytes) {
    return {
      success: false,
      response: new Response(
        JSON.stringify({ code: "PAYLOAD_TOO_LARGE", message: `Body excede ${maxBytes} bytes` }),
        { status: 413, headers: { "Content-Type": "application/json", ...cors } },
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
        { status: 400, headers: { "Content-Type": "application/json", ...cors } },
      ),
    };
  }
}

/**
 * Combine parseJsonBody + validatePayload in one call.
 * Automatically extracts contract version from X-Api-Version / X-Contract-Version headers
 * unless `opts.version` is explicitly provided.
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
  const { cors = {}, maxBytes = 100_000 } = opts;
  // Read version from header if not explicitly overridden by caller.
  const version: ContractVersion = opts.version ?? getContractVersion(req);

  const bodyResult = await parseJsonBody(req, maxBytes, cors);
  if (!bodyResult.success) return bodyResult;

  return validatePayload(schema, bodyResult.data, cors, version);
}
