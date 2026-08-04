/**
 * VISÃO — Webhook & Edge Function Schemas (Onda webhook-edge-functions-schema).
 *
 * Centralized Zod schemas for all webhook-receiving Edge Functions.
 * Covers functions that receive external payloads and need input validation.
 *
 * Schema versioning:
 *  - V1 schemas: original contract (conservative, no breaking changes allowed)
 *  - V2 schemas: extend V1 with additive fields (must remain backward-compatible)
 *
 * IMPORTANT: V2 schemas must be supersets of V1. Every V1-valid payload must also
 * pass V2 validation. This enables lossless backward-compatible versioning.
 */
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";

// ─────────────────────────────────────────────────────────────
// Common primitives
// ─────────────────────────────────────────────────────────────

const uuid = z.string().uuid("deve ser um UUID válido");
const isoDatetime = z.string().datetime({ offset: true, message: "deve ser uma data ISO 8601 válida" });

// ─────────────────────────────────────────────────────────────
// ingest-auth — MediaMTX publish/unpublish webhook
// POST { action, stream_key, protocol?, client_ip? }
// ─────────────────────────────────────────────────────────────

export const IngestAuthSchemaV1 = z.object({
  action: z.enum(["publish", "unpublish"], {
    errorMap: () => ({ message: 'action deve ser "publish" ou "unpublish"' }),
  }),
  stream_key: z
    .string()
    .min(1, "stream_key é obrigatório")
    .regex(/^[a-f0-9]{32,64}$/, "stream_key deve ser hex de 32-64 caracteres"),
  protocol: z.enum(["rtmp_push", "srt_push"], {
    errorMap: () => ({ message: 'protocol deve ser "rtmp_push" ou "srt_push"' }),
  }).optional(),
  client_ip: z.string().max(64, "client_ip excede 64 caracteres").optional(),
}).strict();

// V2 adds optional session_id and a bounded metadata map.
// Uses z.object().strict() directly instead of .omit({}).extend() to preserve strict mode.
export const IngestAuthSchemaV2 = z.object({
  action: z.enum(["publish", "unpublish"], {
    errorMap: () => ({ message: 'action deve ser "publish" ou "unpublish"' }),
  }),
  stream_key: z
    .string()
    .min(1, "stream_key é obrigatório")
    .regex(/^[a-f0-9]{32,64}$/, "stream_key deve ser hex de 32-64 caracteres"),
  protocol: z.enum(["rtmp_push", "srt_push"], {
    errorMap: () => ({ message: 'protocol deve ser "rtmp_push" ou "srt_push"' }),
  }).optional(),
  client_ip: z.string().max(64, "client_ip excede 64 caracteres").optional(),
  session_id: uuid.optional(),
  // z.record(keySchema, valueSchema) — keys 1-64 chars, values max 256 chars.
  // superRefine enforces key count since z.record has no .max() on entries.
  metadata: z.record(z.string().min(1).max(64), z.string().max(256)).optional().superRefine((val, ctx) => {
    if (val !== undefined && Object.keys(val).length > 10) {
      ctx.addIssue({
        code: "too_big",
        type: "object",
        maximum: 10,
        inclusive: true,
        message: "metadata não pode ter mais de 10 chaves",
      });
    }
  }),
}).strict();

export type IngestAuthPayloadV1 = z.infer<typeof IngestAuthSchemaV1>;
export type IngestAuthPayloadV2 = z.infer<typeof IngestAuthSchemaV2>;

// ─────────────────────────────────────────────────────────────
// csp-report — CSP Violation Report endpoint
// Accepts legacy format OR Reporting API array format
// ─────────────────────────────────────────────────────────────

export const CspReportLegacyBodySchema = z.object({
  "csp-report": z.record(z.unknown()).optional(),
}).passthrough();

export const CspReportingApiItemSchema = z.object({
  type: z.string().min(1),
  body: z.record(z.unknown()),
  age: z.number().optional(),
  url: z.string().optional(),
  user_agent: z.string().optional(),
}).passthrough();

export const CspReportingApiArraySchema = z.array(CspReportingApiItemSchema).min(1, "pelo menos 1 report");

export type CspReportLegacyBody = z.infer<typeof CspReportLegacyBodySchema>;
export type CspReportingApiItem = z.infer<typeof CspReportingApiItemSchema>;

// ─────────────────────────────────────────────────────────────
// agent-ingest — Local Agent webhook routes
// POST /heartbeat | /discoveries | /relay-poll | /relay-complete
// Fields match what agent-ingest/index.ts actually reads.
// ─────────────────────────────────────────────────────────────

export const AgentHeartbeatSchemaV1 = z.object({
  agent_version: z.string().min(1, "agent_version não pode ser vazio").max(40, "agent_version excede 40 caracteres").optional(),
  network_cidr: z.string().max(60, "network_cidr excede 60 caracteres").optional(),
}).strict();

// V2: additive fields preserved, strict() explicit.
export const AgentHeartbeatSchemaV2 = z.object({
  agent_version: z.string().min(1, "agent_version não pode ser vazio").max(40, "agent_version excede 40 caracteres").optional(),
  network_cidr: z.string().max(60, "network_cidr excede 60 caracteres").optional(),
  capabilities: z.array(z.string().min(1).max(64)).max(50).optional(),
  region: z.string().max(64).optional(),
}).strict();

export const DiscoveryItemSchema = z.object({
  host: z.string().min(1, "host é obrigatório").max(253, "host excede 253 caracteres"),
  // .finite() rejects NaN and Infinity which sneak through bare z.number()
  port: z.number().int("port deve ser inteiro").finite().min(1, "port mínimo 1").max(65535, "port máximo 65535"),
  manufacturer: z.string().min(1).max(100).nullish(),
  model: z.string().min(1).max(100).nullish(),
  firmware: z.string().min(1).max(100).nullish(),
  onvif_endpoint: z.string().url("onvif_endpoint deve ser URL válida").nullish(),
  rtsp_primary: z.string().min(1).max(512).nullish(),
  rtsp_substream: z.string().min(1).max(512).nullish(),
  ptz_capable: z.boolean().nullish(),
  discovered_at: isoDatetime.nullish(),
  raw: z.unknown().optional(),
}).strict();

export const AgentDiscoveriesSchemaV1 = z.object({
  discoveries: z
    .array(DiscoveryItemSchema)
    .min(1, "discoveries deve ter ao menos 1 item")
    .max(128, "discoveries excede o limite de 128 itens"),
}).strict();

// V2: additive source and scan_duration_ms fields; strict() explicit.
export const AgentDiscoveriesSchemaV2 = z.object({
  discoveries: z
    .array(DiscoveryItemSchema)
    .min(1, "discoveries deve ter ao menos 1 item")
    .max(128, "discoveries excede o limite de 128 itens"),
  source: z.enum(["onvif", "mdns", "manual"]).optional(),
  scan_duration_ms: z.number().int().finite().min(0).optional(),
}).strict();

// relay-poll: `max` controls how many tasks to return (matches agent-ingest/index.ts).
// Note: field is `max`, not `timeout_ms` — the long-poll timeout is server-side only.
export const AgentRelayPollSchema = z.object({
  max: z.number().int().finite().min(1).max(8).optional(),
}).strict();

// relay-complete: fields match agent-ingest/index.ts relay-complete route.
// Note: function reads task_id (not command_id), response (not output).
export const AgentRelayCompleteSchemaV1 = z.object({
  task_id: z.string().min(1, "task_id é obrigatório").max(128),
  response: z.unknown().optional(),
  error: z.string().min(1, "error não pode ser vazio").max(500, "error excede 500 caracteres").optional(),
}).strict();

// V2: additive exit_code and duration_ms; strict() explicit.
export const AgentRelayCompleteSchemaV2 = z.object({
  task_id: z.string().min(1, "task_id é obrigatório").max(128),
  response: z.unknown().optional(),
  error: z.string().min(1, "error não pode ser vazio").max(500, "error excede 500 caracteres").optional(),
  // Bounded to signed 32-bit range to avoid DB integer overflow.
  exit_code: z.number().int().finite().min(-2_147_483_648).max(2_147_483_647).optional(),
  duration_ms: z.number().int().finite().min(0).optional(),
}).strict();

export type AgentHeartbeatPayloadV1 = z.infer<typeof AgentHeartbeatSchemaV1>;
export type AgentHeartbeatPayloadV2 = z.infer<typeof AgentHeartbeatSchemaV2>;
export type DiscoveryItem = z.infer<typeof DiscoveryItemSchema>;
export type AgentDiscoveriesPayloadV1 = z.infer<typeof AgentDiscoveriesSchemaV1>;
export type AgentDiscoveriesPayloadV2 = z.infer<typeof AgentDiscoveriesSchemaV2>;
export type AgentRelayPollPayload = z.infer<typeof AgentRelayPollSchema>;
export type AgentRelayCompletePayloadV1 = z.infer<typeof AgentRelayCompleteSchemaV1>;
export type AgentRelayCompletePayloadV2 = z.infer<typeof AgentRelayCompleteSchemaV2>;

// ─────────────────────────────────────────────────────────────
// csp-anomaly-notify — Cron-triggered notification endpoint
// Header: x-cron-secret (optional secret guard)
// Body: empty or passthrough (no structured payload required)
// ─────────────────────────────────────────────────────────────

export const CspAnomalyNotifySchema = z.object({}).passthrough();

// ─────────────────────────────────────────────────────────────
// Telemetry / alert functions that use URL query parameters only.
// These schemas validate the QUERY PARAMS (not a JSON body).
// Functions: stream-health-probe, preview-telemetry-alert,
//            connectivity-resolution-alert, vault-coverage-watchdog
// ─────────────────────────────────────────────────────────────

// stream-health-probe is a batch cron that reads all cameras from DB — no per-camera input.
// Accepts an optional query param to limit batch size.
export const StreamHealthProbeQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).optional(),
}).strict();

// preview-telemetry-alert reads ?window=&min=&threshold= query params.
export const PreviewTelemetryAlertQuerySchema = z.object({
  window: z.coerce.number().int().finite().min(1).max(1440).optional(),
  min: z.coerce.number().int().finite().min(1).max(100000).optional(),
  threshold: z.coerce.number().finite().min(0).max(1).optional(),
}).strict();

// connectivity-resolution-alert reads ?window=&min=&threshold= query params.
export const ConnectivityResolutionAlertQuerySchema = z.object({
  window: z.coerce.number().int().finite().min(1).max(1440).optional(),
  min: z.coerce.number().int().finite().min(1).max(100000).optional(),
  threshold: z.coerce.number().finite().min(0).max(1).optional(),
}).strict();

// vault-coverage-watchdog reads a single-row aggregate view — no meaningful query params.
// Empty strict schema rejects unknown params while making the contract explicit.
export const VaultCoverageWatchdogQuerySchema = z.object({}).strict();

// ─────────────────────────────────────────────────────────────
// watchdog-ack-sla-alert — SLA monitor with optional POST body
// POST { force?, min_ack?, min_esc?, mtta_cap_min? }
// These field names match the actual function implementation.
// ─────────────────────────────────────────────────────────────

export const WatchdogAckSlaAlertSchemaV1 = z.object({
  force: z.boolean().optional(),
  // Upper bounds guard against PostgreSQL int4 overflow (max 2,147,483,647).
  // Practical ceiling: 10080 minutes = 7 days, beyond which SLA values are nonsensical.
  min_ack: z.number().int().finite().min(0).max(10080).optional(),
  min_esc: z.number().int().finite().min(0).max(10080).optional(),
  mtta_cap_min: z.number().int().finite().min(0).max(10080).optional(),
}).strict();

// ─────────────────────────────────────────────────────────────
// monitoring-center-dispatch — Queue worker with optional limit
// POST { limit? }  — dispatches from internal alert queue, not from caller
// ─────────────────────────────────────────────────────────────

export const MonitoringCenterDispatchSchemaV1 = z.object({
  limit: z.number().int().finite().min(1).max(100).optional(),
}).strict();

// ─────────────────────────────────────────────────────────────
// Re-exports from existing schema files
// ─────────────────────────────────────────────────────────────

export {
  armDisarmSchema,
  acknowledgeAlertSchema,
  panicSchema,
  clipUrlQuerySchema,
  eventsSummaryQuerySchema,
} from "./publicApiSchemas.ts";

export {
  DetectSchema as InsightFaceDetectSchema,
  EncodeSchema as InsightFaceEncodeSchema,
  AnalyzeSchema as InsightFaceAnalyzeSchema,
  LivenessSchema as InsightFaceLivenessSchema,
  MigrateBatchSchema as InsightFaceMigrateBatchSchema,
} from "./insightface-schemas.ts";

export {
  analyzeImageSchema,
  analyzeLicensePlateSchema,
  detectFacesSchema,
  compareFacesSchema,
  detectBehaviorSchema,
  sendTelegramSchema,
  sendAlertNotificationSchema,
  processAutomationRulesSchema,
  adminUsersUpdateRoleSchema,
} from "./validation.ts";
