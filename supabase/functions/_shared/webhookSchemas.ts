/**
 * VISÃO — Webhook & Edge Function Schemas (Onda webhook-edge-functions-schema).
 *
 * Centralized Zod schemas for all webhook-receiving Edge Functions.
 * Covers functions that receive external payloads and need input validation.
 *
 * Schema versioning:
 *  - V1 schemas: original contract (conservative, no breaking changes allowed)
 *  - V2 schemas: extend V1 with additive fields (must remain backward-compatible)
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

export const IngestAuthSchemaV2 = IngestAuthSchemaV1.omit({}).extend({
  session_id: uuid.optional(),
  metadata: z.record(z.string().max(256)).max(10).optional(),
});

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
// ─────────────────────────────────────────────────────────────

export const AgentHeartbeatSchemaV1 = z.object({
  agent_version: z.string().max(40, "agent_version excede 40 caracteres").optional(),
  network_cidr: z.string().max(60, "network_cidr excede 60 caracteres").optional(),
}).strict();

export const AgentHeartbeatSchemaV2 = AgentHeartbeatSchemaV1.omit({}).extend({
  capabilities: z.array(z.string().max(64)).max(50).optional(),
  region: z.string().max(64).optional(),
});

export const DiscoveryItemSchema = z.object({
  host: z.string().min(1, "host é obrigatório").max(253, "host excede 253 caracteres"),
  port: z.number().int("port deve ser inteiro").min(1, "port mínimo 1").max(65535, "port máximo 65535"),
  manufacturer: z.string().max(100).nullish(),
  model: z.string().max(100).nullish(),
  firmware: z.string().max(100).nullish(),
  onvif_endpoint: z.string().url("onvif_endpoint deve ser URL válida").nullish(),
  rtsp_primary: z.string().max(512).nullish(),
  rtsp_substream: z.string().max(512).nullish(),
  ptz_capable: z.boolean().optional(),
  discovered_at: isoDatetime.optional(),
  raw: z.unknown().optional(),
});

export const AgentDiscoveriesSchemaV1 = z.object({
  discoveries: z
    .array(DiscoveryItemSchema)
    .min(1, "discoveries deve ter ao menos 1 item")
    .max(128, "discoveries excede o limite de 128 itens"),
}).strict();

export const AgentDiscoveriesSchemaV2 = z.object({
  discoveries: z
    .array(DiscoveryItemSchema)
    .min(1, "discoveries deve ter ao menos 1 item")
    .max(128, "discoveries excede o limite de 128 itens"),
  source: z.enum(["onvif", "mdns", "manual"]).optional(),
  scan_duration_ms: z.number().int().min(0).optional(),
});

export const AgentRelayPollSchema = z.object({
  timeout_ms: z.number().int().min(0).max(30_000).optional(),
}).strict();

export const AgentRelayCompleteSchemaV1 = z.object({
  command_id: uuid,
  success: z.boolean({ required_error: "success é obrigatório" }),
  output: z.string().max(65_536, "output excede 65536 bytes").optional(),
  error: z.string().max(2_048, "error excede 2048 bytes").optional(),
}).strict();

export const AgentRelayCompleteSchemaV2 = AgentRelayCompleteSchemaV1.omit({}).extend({
  duration_ms: z.number().int().min(0).optional(),
  exit_code: z.number().int().optional(),
});

export type AgentHeartbeatPayloadV1 = z.infer<typeof AgentHeartbeatSchemaV1>;
export type AgentHeartbeatPayloadV2 = z.infer<typeof AgentHeartbeatSchemaV2>;
export type DiscoveryItem = z.infer<typeof DiscoveryItemSchema>;
export type AgentDiscoveriesPayloadV1 = z.infer<typeof AgentDiscoveriesSchemaV1>;
export type AgentRelayCompletePayloadV1 = z.infer<typeof AgentRelayCompleteSchemaV1>;

// ─────────────────────────────────────────────────────────────
// csp-anomaly-notify — Cron-triggered notification endpoint
// Header: x-cron-secret (optional secret guard)
// Body: empty or passthrough (no structured payload required)
// ─────────────────────────────────────────────────────────────

export const CspAnomalyNotifySchema = z.object({}).passthrough();

// ─────────────────────────────────────────────────────────────
// stream-health-probe — Camera stream health check
// ─────────────────────────────────────────────────────────────

export const StreamHealthProbeSchemaV1 = z.object({
  camera_id: uuid,
  stream_url: z.string().url("stream_url deve ser URL válida").optional(),
  timeout_ms: z.number().int().min(1000).max(30_000).optional(),
}).strict();

export const StreamHealthProbeSchemaV2 = StreamHealthProbeSchemaV1.omit({}).extend({
  check_audio: z.boolean().optional(),
  expected_codec: z.string().max(32).optional(),
});

// ─────────────────────────────────────────────────────────────
// preview-telemetry-alert — Telemetry alert ingestion
// ─────────────────────────────────────────────────────────────

export const PreviewTelemetryAlertSchemaV1 = z.object({
  camera_id: uuid,
  alert_type: z.string().min(1).max(64),
  severity: z.enum(["low", "medium", "high", "critical"]),
  metric: z.string().min(1).max(128),
  value: z.number(),
  threshold: z.number().optional(),
  timestamp: isoDatetime.optional(),
}).strict();

// ─────────────────────────────────────────────────────────────
// connectivity-resolution-alert — Network connectivity alerts
// ─────────────────────────────────────────────────────────────

export const ConnectivityResolutionAlertSchemaV1 = z.object({
  camera_id: uuid,
  resolution_type: z.enum(["reconnected", "timeout", "dns_failure", "auth_failure"]),
  details: z.string().max(1024).optional(),
  duration_ms: z.number().int().min(0).optional(),
}).strict();

// ─────────────────────────────────────────────────────────────
// watchdog-ack-sla-alert — SLA breach acknowledgement
// ─────────────────────────────────────────────────────────────

export const WatchdogAckSlaAlertSchemaV1 = z.object({
  alert_id: uuid,
  acknowledged_by: uuid,
  note: z.string().max(1000).optional(),
}).strict();

// ─────────────────────────────────────────────────────────────
// monitoring-center-dispatch — Dispatch to monitoring center
// ─────────────────────────────────────────────────────────────

export const MonitoringCenterDispatchSchemaV1 = z.object({
  alert_id: uuid,
  camera_id: uuid.optional(),
  severity: z.enum(["low", "medium", "high", "critical"]),
  message: z.string().min(1).max(2000),
  dispatch_to: z.array(z.string().email()).min(1).max(50),
}).strict();

// ─────────────────────────────────────────────────────────────
// vault-coverage-watchdog — Vault coverage monitoring
// ─────────────────────────────────────────────────────────────

export const VaultCoverageWatchdogSchemaV1 = z.object({
  camera_ids: z.array(uuid).min(1).max(100).optional(),
  threshold_hours: z.number().int().min(1).max(720).optional(),
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
