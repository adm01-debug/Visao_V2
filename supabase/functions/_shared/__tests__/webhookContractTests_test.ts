/**
 * Contract tests for all webhook schemas.
 * Tests valid/invalid payloads against Zod schemas and verifies 422 response shape.
 */
import {
  assertEquals,
  assertExists,
  assert,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  IngestAuthSchemaV1,
  IngestAuthSchemaV2,
  CspReportLegacyBodySchema,
  CspReportingApiItemSchema,
  CspReportingApiArraySchema,
  AgentHeartbeatSchemaV1,
  AgentHeartbeatSchemaV2,
  DiscoveryItemSchema,
  AgentDiscoveriesSchemaV1,
  AgentDiscoveriesSchemaV2,
  AgentRelayPollSchema,
  AgentRelayCompleteSchemaV1,
  AgentRelayCompleteSchemaV2,
  StreamHealthProbeSchemaV1,
  StreamHealthProbeSchemaV2,
  PreviewTelemetryAlertSchemaV1,
  ConnectivityResolutionAlertSchemaV1,
  WatchdogAckSlaAlertSchemaV1,
  MonitoringCenterDispatchSchemaV1,
  VaultCoverageWatchdogSchemaV1,
} from "../webhookSchemas.ts";
import { validatePayload, validateVersionedPayload } from "../contractValidation.ts";

// UUIDs válidos para testes
const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000";
const VALID_UUID_2 = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";
const VALID_STREAM_KEY = "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4"; // 32 hex chars
const VALID_DATETIME = "2024-01-15T10:30:00+00:00";

// Helper para verificar shape da resposta 422
async function assert422Shape(response: Response, expectedField?: string) {
  assertEquals(response.status, 422);
  const body = await response.json();
  assertEquals(body.code, "VALIDATION_ERROR");
  assertExists(body.message);
  assert(Array.isArray(body.fields));
  assertExists(body.contract_version);
  if (expectedField) {
    assert(
      body.fields.some((f: { field: string }) => f.field === expectedField || f.field.startsWith(expectedField)),
      `Expected field "${expectedField}" in error fields: ${JSON.stringify(body.fields)}`,
    );
  }
  return body;
}

// ─────────────────────────────────────────────────────────────
// ingest-auth — IngestAuthSchemaV1
// ─────────────────────────────────────────────────────────────

Deno.test("ingest-auth V1: aceita payload publish válido", () => {
  const result = IngestAuthSchemaV1.safeParse({
    action: "publish",
    stream_key: VALID_STREAM_KEY,
  });
  assertEquals(result.success, true);
});

Deno.test("ingest-auth V1: aceita payload unpublish com todos os campos opcionais", () => {
  const result = IngestAuthSchemaV1.safeParse({
    action: "unpublish",
    stream_key: VALID_STREAM_KEY,
    protocol: "rtmp_push",
    client_ip: "192.168.1.1",
  });
  assertEquals(result.success, true);
});

Deno.test("ingest-auth V1: aceita protocol srt_push", () => {
  const result = IngestAuthSchemaV1.safeParse({
    action: "publish",
    stream_key: VALID_STREAM_KEY,
    protocol: "srt_push",
  });
  assertEquals(result.success, true);
});

Deno.test("ingest-auth V1: rejeita action inválida", async () => {
  const result = validatePayload(IngestAuthSchemaV1, {
    action: "start",
    stream_key: VALID_STREAM_KEY,
  });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response, "action");
});

Deno.test("ingest-auth V1: rejeita stream_key ausente", async () => {
  const result = validatePayload(IngestAuthSchemaV1, { action: "publish" });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response, "stream_key");
});

Deno.test("ingest-auth V1: rejeita stream_key com caracteres não-hex", async () => {
  const result = validatePayload(IngestAuthSchemaV1, {
    action: "publish",
    stream_key: "GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG", // hex maiúsculo inválido
  });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response, "stream_key");
});

Deno.test("ingest-auth V1: rejeita stream_key muito curta (< 32 chars)", async () => {
  const result = validatePayload(IngestAuthSchemaV1, {
    action: "publish",
    stream_key: "a1b2c3d4", // só 8 chars
  });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response, "stream_key");
});

Deno.test("ingest-auth V1: rejeita stream_key muito longa (> 64 chars)", async () => {
  const result = validatePayload(IngestAuthSchemaV1, {
    action: "publish",
    stream_key: "a".repeat(65),
  });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response, "stream_key");
});

Deno.test("ingest-auth V1: rejeita protocol inválido", async () => {
  const result = validatePayload(IngestAuthSchemaV1, {
    action: "publish",
    stream_key: VALID_STREAM_KEY,
    protocol: "webrtc",
  });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response, "protocol");
});

Deno.test("ingest-auth V1: rejeita campo desconhecido (strict)", async () => {
  const result = validatePayload(IngestAuthSchemaV1, {
    action: "publish",
    stream_key: VALID_STREAM_KEY,
    unknown_field: "x",
  });
  assertEquals(result.success, false);
});

Deno.test("ingest-auth V1: rejeita payload vazio", async () => {
  const result = validatePayload(IngestAuthSchemaV1, {});
  assertEquals(result.success, false);
  if (!result.success) {
    const body = await assert422Shape(result.response);
    assert(body.fields.length >= 2); // action e stream_key ausentes
  }
});

// ingest-auth V2 — versioning

Deno.test("ingest-auth V2: aceita payload V1 sem campos adicionais (backward compat)", () => {
  const result = IngestAuthSchemaV2.safeParse({
    action: "publish",
    stream_key: VALID_STREAM_KEY,
  });
  assertEquals(result.success, true);
});

Deno.test("ingest-auth V2: aceita session_id UUID", () => {
  const result = IngestAuthSchemaV2.safeParse({
    action: "publish",
    stream_key: VALID_STREAM_KEY,
    session_id: VALID_UUID,
  });
  assertEquals(result.success, true);
});

Deno.test("ingest-auth V2: aceita metadata como record", () => {
  const result = IngestAuthSchemaV2.safeParse({
    action: "publish",
    stream_key: VALID_STREAM_KEY,
    metadata: { region: "br-south", quality: "720p" },
  });
  assertEquals(result.success, true);
});

Deno.test("ingest-auth V2: rejeita session_id inválido (não-UUID)", async () => {
  const result = validatePayload(IngestAuthSchemaV2, {
    action: "publish",
    stream_key: VALID_STREAM_KEY,
    session_id: "nao-e-uuid",
  });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response, "session_id");
});

Deno.test("ingest-auth V2: rejeita metadata com valor longo (> 256 chars)", async () => {
  const result = validatePayload(IngestAuthSchemaV2, {
    action: "publish",
    stream_key: VALID_STREAM_KEY,
    metadata: { key: "x".repeat(257) },
  });
  assertEquals(result.success, false);
});

Deno.test("ingest-auth: versioned validation aceita V1 em endpoint V2", () => {
  const v1Payload = { action: "publish", stream_key: VALID_STREAM_KEY };
  const result = validateVersionedPayload(
    { v1: IngestAuthSchemaV1, v2: IngestAuthSchemaV2 },
    v1Payload,
    "v2",
  );
  assertEquals(result.success, true);
});

// ─────────────────────────────────────────────────────────────
// csp-report
// ─────────────────────────────────────────────────────────────

Deno.test("csp-report legacy: aceita { csp-report: {...} }", () => {
  const result = CspReportLegacyBodySchema.safeParse({
    "csp-report": {
      "document-uri": "https://example.com",
      "violated-directive": "script-src",
    },
  });
  assertEquals(result.success, true);
});

Deno.test("csp-report legacy: aceita body sem csp-report (passthrough)", () => {
  const result = CspReportLegacyBodySchema.safeParse({ other: "field" });
  assertEquals(result.success, true);
});

Deno.test("csp-report Reporting API: aceita item válido", () => {
  const result = CspReportingApiItemSchema.safeParse({
    type: "csp-violation",
    body: { blockedURL: "https://evil.com" },
    age: 100,
    url: "https://example.com",
    user_agent: "Mozilla/5.0",
  });
  assertEquals(result.success, true);
});

Deno.test("csp-report Reporting API: aceita item com apenas type e body", () => {
  const result = CspReportingApiItemSchema.safeParse({
    type: "csp-violation",
    body: {},
  });
  assertEquals(result.success, true);
});

Deno.test("csp-report Reporting API: rejeita item sem type", async () => {
  const result = validatePayload(CspReportingApiItemSchema, {
    body: { blockedURL: "x" },
  });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response, "type");
});

Deno.test("csp-report Reporting API: rejeita item sem body", async () => {
  const result = validatePayload(CspReportingApiItemSchema, {
    type: "csp-violation",
  });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response, "body");
});

Deno.test("csp-report Reporting API: rejeita type vazio", async () => {
  const result = validatePayload(CspReportingApiItemSchema, {
    type: "",
    body: {},
  });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response, "type");
});

Deno.test("csp-report Reporting API array: aceita array com um item", () => {
  const result = CspReportingApiArraySchema.safeParse([
    { type: "csp-violation", body: { blockedURL: "x" } },
  ]);
  assertEquals(result.success, true);
});

Deno.test("csp-report Reporting API array: rejeita array vazio", async () => {
  const result = validatePayload(CspReportingApiArraySchema, []);
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response);
});

// ─────────────────────────────────────────────────────────────
// agent-ingest — heartbeat
// ─────────────────────────────────────────────────────────────

Deno.test("agent heartbeat V1: aceita payload vazio (todos campos opcionais)", () => {
  const result = AgentHeartbeatSchemaV1.safeParse({});
  assertEquals(result.success, true);
});

Deno.test("agent heartbeat V1: aceita com todos os campos", () => {
  const result = AgentHeartbeatSchemaV1.safeParse({
    agent_version: "1.2.3",
    network_cidr: "192.168.1.0/24",
  });
  assertEquals(result.success, true);
});

Deno.test("agent heartbeat V1: rejeita agent_version muito longa", async () => {
  const result = validatePayload(AgentHeartbeatSchemaV1, {
    agent_version: "v" + "1".repeat(40),
  });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response, "agent_version");
});

Deno.test("agent heartbeat V1: rejeita campo desconhecido (strict)", async () => {
  const result = validatePayload(AgentHeartbeatSchemaV1, {
    agent_version: "1.0.0",
    unknown: "field",
  });
  assertEquals(result.success, false);
});

Deno.test("agent heartbeat V2: aceita capabilities e region", () => {
  const result = AgentHeartbeatSchemaV2.safeParse({
    agent_version: "2.0.0",
    capabilities: ["onvif", "rtsp", "ptz"],
    region: "br-south-1",
  });
  assertEquals(result.success, true);
});

Deno.test("agent heartbeat V2: aceita payload V1 sem campos adicionais", () => {
  const result = AgentHeartbeatSchemaV2.safeParse({ agent_version: "1.0.0" });
  assertEquals(result.success, true);
});

Deno.test("agent heartbeat V2: rejeita capabilities com string longa", async () => {
  const result = validatePayload(AgentHeartbeatSchemaV2, {
    capabilities: ["x".repeat(65)],
  });
  assertEquals(result.success, false);
});

// ─────────────────────────────────────────────────────────────
// agent-ingest — discoveries
// ─────────────────────────────────────────────────────────────

const validDiscovery = {
  host: "192.168.1.100",
  port: 554,
  manufacturer: "Hikvision",
  model: "DS-2CD2142FWD",
  firmware: "5.6.2",
  onvif_endpoint: "http://192.168.1.100/onvif/device_service",
  rtsp_primary: "rtsp://192.168.1.100/live/main",
  rtsp_substream: "rtsp://192.168.1.100/live/sub",
  ptz_capable: false,
  discovered_at: VALID_DATETIME,
};

Deno.test("agent discoveries: DiscoveryItemSchema aceita item completo", () => {
  const result = DiscoveryItemSchema.safeParse(validDiscovery);
  assertEquals(result.success, true);
});

Deno.test("agent discoveries: DiscoveryItemSchema aceita item mínimo", () => {
  const result = DiscoveryItemSchema.safeParse({ host: "cam.local", port: 554 });
  assertEquals(result.success, true);
});

Deno.test("agent discoveries: DiscoveryItemSchema rejeita host ausente", async () => {
  const result = validatePayload(DiscoveryItemSchema, { port: 554 });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response, "host");
});

Deno.test("agent discoveries: DiscoveryItemSchema rejeita host vazio", async () => {
  const result = validatePayload(DiscoveryItemSchema, { host: "", port: 554 });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response, "host");
});

Deno.test("agent discoveries: DiscoveryItemSchema rejeita port ausente", async () => {
  const result = validatePayload(DiscoveryItemSchema, { host: "cam.local" });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response, "port");
});

Deno.test("agent discoveries: DiscoveryItemSchema rejeita port fora do range (0)", async () => {
  const result = validatePayload(DiscoveryItemSchema, { host: "cam.local", port: 0 });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response, "port");
});

Deno.test("agent discoveries: DiscoveryItemSchema rejeita port fora do range (65536)", async () => {
  const result = validatePayload(DiscoveryItemSchema, { host: "cam.local", port: 65536 });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response, "port");
});

Deno.test("agent discoveries: DiscoveryItemSchema rejeita port não-inteiro", async () => {
  const result = validatePayload(DiscoveryItemSchema, { host: "cam.local", port: 554.5 });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response, "port");
});

Deno.test("agent discoveries: DiscoveryItemSchema rejeita onvif_endpoint URL inválida", async () => {
  const result = validatePayload(DiscoveryItemSchema, {
    host: "cam.local",
    port: 554,
    onvif_endpoint: "nao-e-url",
  });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response, "onvif_endpoint");
});

Deno.test("agent discoveries: DiscoveryItemSchema aceita onvif_endpoint null", () => {
  const result = DiscoveryItemSchema.safeParse({
    host: "cam.local",
    port: 554,
    onvif_endpoint: null,
  });
  assertEquals(result.success, true);
});

Deno.test("agent discoveries V1: aceita lista com uma câmera", () => {
  const result = AgentDiscoveriesSchemaV1.safeParse({
    discoveries: [{ host: "cam.local", port: 554 }],
  });
  assertEquals(result.success, true);
});

Deno.test("agent discoveries V1: rejeita lista vazia", async () => {
  const result = validatePayload(AgentDiscoveriesSchemaV1, { discoveries: [] });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response, "discoveries");
});

Deno.test("agent discoveries V1: rejeita discoveries ausente", async () => {
  const result = validatePayload(AgentDiscoveriesSchemaV1, {});
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response, "discoveries");
});

Deno.test("agent discoveries V1: rejeita discoveries com mais de 128 itens", async () => {
  const result = validatePayload(AgentDiscoveriesSchemaV1, {
    discoveries: Array.from({ length: 129 }, (_, i) => ({
      host: `cam${i}.local`,
      port: 554,
    })),
  });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response, "discoveries");
});

Deno.test("agent discoveries V1: rejeita item com tipo incorreto em host", async () => {
  const result = validatePayload(AgentDiscoveriesSchemaV1, {
    discoveries: [{ host: 12345, port: 554 }],
  });
  assertEquals(result.success, false);
  if (!result.success) {
    const body = await assert422Shape(result.response);
    assert(body.fields.some((f: { field: string }) => f.field.includes("host")));
  }
});

Deno.test("agent discoveries V2: aceita source e scan_duration_ms", () => {
  const result = AgentDiscoveriesSchemaV2.safeParse({
    discoveries: [{ host: "cam.local", port: 554 }],
    source: "onvif",
    scan_duration_ms: 5000,
  });
  assertEquals(result.success, true);
});

Deno.test("agent discoveries V2: rejeita source inválida", async () => {
  const result = validatePayload(AgentDiscoveriesSchemaV2, {
    discoveries: [{ host: "cam.local", port: 554 }],
    source: "zeroconf",
  });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response, "source");
});

// ─────────────────────────────────────────────────────────────
// agent-ingest — relay-poll
// ─────────────────────────────────────────────────────────────

Deno.test("agent relay-poll: aceita payload vazio", () => {
  const result = AgentRelayPollSchema.safeParse({});
  assertEquals(result.success, true);
});

Deno.test("agent relay-poll: aceita timeout_ms válido", () => {
  const result = AgentRelayPollSchema.safeParse({ timeout_ms: 5000 });
  assertEquals(result.success, true);
});

Deno.test("agent relay-poll: rejeita timeout_ms negativo", async () => {
  const result = validatePayload(AgentRelayPollSchema, { timeout_ms: -1 });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response, "timeout_ms");
});

Deno.test("agent relay-poll: rejeita timeout_ms acima de 30000", async () => {
  const result = validatePayload(AgentRelayPollSchema, { timeout_ms: 30001 });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response, "timeout_ms");
});

Deno.test("agent relay-poll: rejeita campo desconhecido (strict)", async () => {
  const result = validatePayload(AgentRelayPollSchema, { unknown: "x" });
  assertEquals(result.success, false);
});

// ─────────────────────────────────────────────────────────────
// agent-ingest — relay-complete
// ─────────────────────────────────────────────────────────────

Deno.test("agent relay-complete V1: aceita payload mínimo válido", () => {
  const result = AgentRelayCompleteSchemaV1.safeParse({
    command_id: VALID_UUID,
    success: true,
  });
  assertEquals(result.success, true);
});

Deno.test("agent relay-complete V1: aceita com output e error opcionais", () => {
  const result = AgentRelayCompleteSchemaV1.safeParse({
    command_id: VALID_UUID,
    success: false,
    output: "stdout output",
    error: "stderr message",
  });
  assertEquals(result.success, true);
});

Deno.test("agent relay-complete V1: rejeita command_id ausente", async () => {
  const result = validatePayload(AgentRelayCompleteSchemaV1, { success: true });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response, "command_id");
});

Deno.test("agent relay-complete V1: rejeita command_id não-UUID", async () => {
  const result = validatePayload(AgentRelayCompleteSchemaV1, {
    command_id: "nao-e-uuid",
    success: true,
  });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response, "command_id");
});

Deno.test("agent relay-complete V1: rejeita success ausente", async () => {
  const result = validatePayload(AgentRelayCompleteSchemaV1, { command_id: VALID_UUID });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response, "success");
});

Deno.test("agent relay-complete V1: rejeita success como string", async () => {
  const result = validatePayload(AgentRelayCompleteSchemaV1, {
    command_id: VALID_UUID,
    success: "true",
  });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response, "success");
});

Deno.test("agent relay-complete V1: rejeita output acima de 65536 chars", async () => {
  const result = validatePayload(AgentRelayCompleteSchemaV1, {
    command_id: VALID_UUID,
    success: true,
    output: "x".repeat(65537),
  });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response, "output");
});

Deno.test("agent relay-complete V2: aceita duration_ms e exit_code", () => {
  const result = AgentRelayCompleteSchemaV2.safeParse({
    command_id: VALID_UUID,
    success: true,
    duration_ms: 1500,
    exit_code: 0,
  });
  assertEquals(result.success, true);
});

Deno.test("agent relay-complete V2: aceita payload V1 (backward compat)", () => {
  const result = AgentRelayCompleteSchemaV2.safeParse({
    command_id: VALID_UUID,
    success: true,
  });
  assertEquals(result.success, true);
});

Deno.test("agent relay-complete V2: rejeita duration_ms negativo", async () => {
  const result = validatePayload(AgentRelayCompleteSchemaV2, {
    command_id: VALID_UUID,
    success: true,
    duration_ms: -1,
  });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response, "duration_ms");
});

// Versioning com validateVersionedPayload
Deno.test("agent relay-complete: versioned validation aceita V1 em endpoint V2", () => {
  const v1Payload = { command_id: VALID_UUID, success: true };
  const result = validateVersionedPayload(
    { v1: AgentRelayCompleteSchemaV1, v2: AgentRelayCompleteSchemaV2 },
    v1Payload,
    "v2",
  );
  assertEquals(result.success, true);
});

// ─────────────────────────────────────────────────────────────
// stream-health-probe
// ─────────────────────────────────────────────────────────────

Deno.test("stream-health-probe V1: aceita payload mínimo", () => {
  const result = StreamHealthProbeSchemaV1.safeParse({ camera_id: VALID_UUID });
  assertEquals(result.success, true);
});

Deno.test("stream-health-probe V1: aceita com todos os campos opcionais", () => {
  const result = StreamHealthProbeSchemaV1.safeParse({
    camera_id: VALID_UUID,
    stream_url: "rtsp://cam.local/live",
    timeout_ms: 5000,
  });
  assertEquals(result.success, true);
});

Deno.test("stream-health-probe V1: rejeita camera_id ausente", async () => {
  const result = validatePayload(StreamHealthProbeSchemaV1, {});
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response, "camera_id");
});

Deno.test("stream-health-probe V1: rejeita camera_id inválido (não-UUID)", async () => {
  const result = validatePayload(StreamHealthProbeSchemaV1, {
    camera_id: "nao-uuid",
  });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response, "camera_id");
});

Deno.test("stream-health-probe V1: rejeita stream_url inválida", async () => {
  const result = validatePayload(StreamHealthProbeSchemaV1, {
    camera_id: VALID_UUID,
    stream_url: "nao-e-url",
  });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response, "stream_url");
});

Deno.test("stream-health-probe V1: rejeita timeout_ms abaixo de 1000", async () => {
  const result = validatePayload(StreamHealthProbeSchemaV1, {
    camera_id: VALID_UUID,
    timeout_ms: 999,
  });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response, "timeout_ms");
});

Deno.test("stream-health-probe V1: rejeita timeout_ms acima de 30000", async () => {
  const result = validatePayload(StreamHealthProbeSchemaV1, {
    camera_id: VALID_UUID,
    timeout_ms: 30001,
  });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response, "timeout_ms");
});

Deno.test("stream-health-probe V2: aceita check_audio e expected_codec", () => {
  const result = StreamHealthProbeSchemaV2.safeParse({
    camera_id: VALID_UUID,
    check_audio: true,
    expected_codec: "h264",
  });
  assertEquals(result.success, true);
});

Deno.test("stream-health-probe V2: rejeita expected_codec longo (> 32 chars)", async () => {
  const result = validatePayload(StreamHealthProbeSchemaV2, {
    camera_id: VALID_UUID,
    expected_codec: "c".repeat(33),
  });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response, "expected_codec");
});

// ─────────────────────────────────────────────────────────────
// preview-telemetry-alert
// ─────────────────────────────────────────────────────────────

Deno.test("preview-telemetry-alert V1: aceita payload completo", () => {
  const result = PreviewTelemetryAlertSchemaV1.safeParse({
    camera_id: VALID_UUID,
    alert_type: "cpu_spike",
    severity: "high",
    metric: "cpu_usage_percent",
    value: 98.5,
    threshold: 90.0,
    timestamp: VALID_DATETIME,
  });
  assertEquals(result.success, true);
});

Deno.test("preview-telemetry-alert V1: aceita payload mínimo", () => {
  const result = PreviewTelemetryAlertSchemaV1.safeParse({
    camera_id: VALID_UUID,
    alert_type: "latency",
    severity: "low",
    metric: "rtt_ms",
    value: 250,
  });
  assertEquals(result.success, true);
});

Deno.test("preview-telemetry-alert V1: rejeita camera_id ausente", async () => {
  const result = validatePayload(PreviewTelemetryAlertSchemaV1, {
    alert_type: "cpu_spike",
    severity: "high",
    metric: "cpu",
    value: 90,
  });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response, "camera_id");
});

Deno.test("preview-telemetry-alert V1: rejeita severity inválida", async () => {
  const result = validatePayload(PreviewTelemetryAlertSchemaV1, {
    camera_id: VALID_UUID,
    alert_type: "cpu_spike",
    severity: "extreme",
    metric: "cpu",
    value: 99,
  });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response, "severity");
});

Deno.test("preview-telemetry-alert V1: rejeita todos os severities inválidos", async () => {
  for (const sev of ["none", "warning", "emergency", ""]) {
    const result = validatePayload(PreviewTelemetryAlertSchemaV1, {
      camera_id: VALID_UUID,
      alert_type: "test",
      severity: sev,
      metric: "m",
      value: 1,
    });
    assertEquals(result.success, false, `severity "${sev}" deveria ser rejeitada`);
  }
});

Deno.test("preview-telemetry-alert V1: aceita todos os severities válidos", () => {
  for (const sev of ["low", "medium", "high", "critical"]) {
    const result = PreviewTelemetryAlertSchemaV1.safeParse({
      camera_id: VALID_UUID,
      alert_type: "test",
      severity: sev,
      metric: "m",
      value: 1,
    });
    assertEquals(result.success, true, `severity "${sev}" deveria ser aceita`);
  }
});

Deno.test("preview-telemetry-alert V1: rejeita value como string", async () => {
  const result = validatePayload(PreviewTelemetryAlertSchemaV1, {
    camera_id: VALID_UUID,
    alert_type: "test",
    severity: "low",
    metric: "m",
    value: "noventa",
  });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response, "value");
});

Deno.test("preview-telemetry-alert V1: rejeita timestamp inválido", async () => {
  const result = validatePayload(PreviewTelemetryAlertSchemaV1, {
    camera_id: VALID_UUID,
    alert_type: "test",
    severity: "low",
    metric: "m",
    value: 1,
    timestamp: "nao-e-datetime",
  });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response, "timestamp");
});

// ─────────────────────────────────────────────────────────────
// connectivity-resolution-alert
// ─────────────────────────────────────────────────────────────

Deno.test("connectivity-resolution-alert V1: aceita payload mínimo", () => {
  const result = ConnectivityResolutionAlertSchemaV1.safeParse({
    camera_id: VALID_UUID,
    resolution_type: "reconnected",
  });
  assertEquals(result.success, true);
});

Deno.test("connectivity-resolution-alert V1: aceita todos os resolution_types", () => {
  for (const rt of ["reconnected", "timeout", "dns_failure", "auth_failure"]) {
    const result = ConnectivityResolutionAlertSchemaV1.safeParse({
      camera_id: VALID_UUID,
      resolution_type: rt,
    });
    assertEquals(result.success, true, `resolution_type "${rt}" deveria ser aceito`);
  }
});

Deno.test("connectivity-resolution-alert V1: rejeita resolution_type inválido", async () => {
  const result = validatePayload(ConnectivityResolutionAlertSchemaV1, {
    camera_id: VALID_UUID,
    resolution_type: "packet_loss",
  });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response, "resolution_type");
});

Deno.test("connectivity-resolution-alert V1: rejeita camera_id ausente", async () => {
  const result = validatePayload(ConnectivityResolutionAlertSchemaV1, {
    resolution_type: "timeout",
  });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response, "camera_id");
});

Deno.test("connectivity-resolution-alert V1: rejeita duration_ms negativo", async () => {
  const result = validatePayload(ConnectivityResolutionAlertSchemaV1, {
    camera_id: VALID_UUID,
    resolution_type: "reconnected",
    duration_ms: -1,
  });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response, "duration_ms");
});

// ─────────────────────────────────────────────────────────────
// watchdog-ack-sla-alert
// ─────────────────────────────────────────────────────────────

Deno.test("watchdog-ack-sla-alert V1: aceita payload mínimo", () => {
  const result = WatchdogAckSlaAlertSchemaV1.safeParse({
    alert_id: VALID_UUID,
    acknowledged_by: VALID_UUID_2,
  });
  assertEquals(result.success, true);
});

Deno.test("watchdog-ack-sla-alert V1: aceita com note opcional", () => {
  const result = WatchdogAckSlaAlertSchemaV1.safeParse({
    alert_id: VALID_UUID,
    acknowledged_by: VALID_UUID_2,
    note: "Câmera reiniciada manualmente.",
  });
  assertEquals(result.success, true);
});

Deno.test("watchdog-ack-sla-alert V1: rejeita alert_id ausente", async () => {
  const result = validatePayload(WatchdogAckSlaAlertSchemaV1, {
    acknowledged_by: VALID_UUID_2,
  });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response, "alert_id");
});

Deno.test("watchdog-ack-sla-alert V1: rejeita acknowledged_by inválido", async () => {
  const result = validatePayload(WatchdogAckSlaAlertSchemaV1, {
    alert_id: VALID_UUID,
    acknowledged_by: "nao-uuid",
  });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response, "acknowledged_by");
});

Deno.test("watchdog-ack-sla-alert V1: rejeita note longa (> 1000 chars)", async () => {
  const result = validatePayload(WatchdogAckSlaAlertSchemaV1, {
    alert_id: VALID_UUID,
    acknowledged_by: VALID_UUID_2,
    note: "n".repeat(1001),
  });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response, "note");
});

Deno.test("watchdog-ack-sla-alert V1: rejeita campo desconhecido (strict)", async () => {
  const result = validatePayload(WatchdogAckSlaAlertSchemaV1, {
    alert_id: VALID_UUID,
    acknowledged_by: VALID_UUID_2,
    extra: "campo",
  });
  assertEquals(result.success, false);
});

// ─────────────────────────────────────────────────────────────
// monitoring-center-dispatch
// ─────────────────────────────────────────────────────────────

Deno.test("monitoring-center-dispatch V1: aceita payload mínimo", () => {
  const result = MonitoringCenterDispatchSchemaV1.safeParse({
    alert_id: VALID_UUID,
    severity: "critical",
    message: "Câmera offline há mais de 5 minutos",
    dispatch_to: ["ops@example.com"],
  });
  assertEquals(result.success, true);
});

Deno.test("monitoring-center-dispatch V1: aceita com camera_id opcional", () => {
  const result = MonitoringCenterDispatchSchemaV1.safeParse({
    alert_id: VALID_UUID,
    camera_id: VALID_UUID_2,
    severity: "high",
    message: "Alerta de câmera",
    dispatch_to: ["a@b.com", "c@d.com"],
  });
  assertEquals(result.success, true);
});

Deno.test("monitoring-center-dispatch V1: rejeita dispatch_to vazio", async () => {
  const result = validatePayload(MonitoringCenterDispatchSchemaV1, {
    alert_id: VALID_UUID,
    severity: "high",
    message: "Alerta",
    dispatch_to: [],
  });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response, "dispatch_to");
});

Deno.test("monitoring-center-dispatch V1: rejeita email inválido em dispatch_to", async () => {
  const result = validatePayload(MonitoringCenterDispatchSchemaV1, {
    alert_id: VALID_UUID,
    severity: "low",
    message: "Alerta",
    dispatch_to: ["nao-e-email"],
  });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response, "dispatch_to");
});

Deno.test("monitoring-center-dispatch V1: rejeita message vazia", async () => {
  const result = validatePayload(MonitoringCenterDispatchSchemaV1, {
    alert_id: VALID_UUID,
    severity: "low",
    message: "",
    dispatch_to: ["a@b.com"],
  });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response, "message");
});

Deno.test("monitoring-center-dispatch V1: rejeita message acima de 2000 chars", async () => {
  const result = validatePayload(MonitoringCenterDispatchSchemaV1, {
    alert_id: VALID_UUID,
    severity: "low",
    message: "m".repeat(2001),
    dispatch_to: ["a@b.com"],
  });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response, "message");
});

Deno.test("monitoring-center-dispatch V1: rejeita mais de 50 destinatários", async () => {
  const result = validatePayload(MonitoringCenterDispatchSchemaV1, {
    alert_id: VALID_UUID,
    severity: "low",
    message: "Alerta",
    dispatch_to: Array.from({ length: 51 }, (_, i) => `user${i}@example.com`),
  });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response, "dispatch_to");
});

// ─────────────────────────────────────────────────────────────
// vault-coverage-watchdog
// ─────────────────────────────────────────────────────────────

Deno.test("vault-coverage-watchdog V1: aceita payload vazio (todos opcionais)", () => {
  const result = VaultCoverageWatchdogSchemaV1.safeParse({});
  assertEquals(result.success, true);
});

Deno.test("vault-coverage-watchdog V1: aceita camera_ids e threshold_hours", () => {
  const result = VaultCoverageWatchdogSchemaV1.safeParse({
    camera_ids: [VALID_UUID, VALID_UUID_2],
    threshold_hours: 24,
  });
  assertEquals(result.success, true);
});

Deno.test("vault-coverage-watchdog V1: rejeita camera_ids com não-UUID", async () => {
  const result = validatePayload(VaultCoverageWatchdogSchemaV1, {
    camera_ids: ["nao-uuid"],
  });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response, "camera_ids");
});

Deno.test("vault-coverage-watchdog V1: rejeita camera_ids vazia", async () => {
  const result = validatePayload(VaultCoverageWatchdogSchemaV1, {
    camera_ids: [],
  });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response, "camera_ids");
});

Deno.test("vault-coverage-watchdog V1: rejeita threshold_hours abaixo de 1", async () => {
  const result = validatePayload(VaultCoverageWatchdogSchemaV1, {
    threshold_hours: 0,
  });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response, "threshold_hours");
});

Deno.test("vault-coverage-watchdog V1: rejeita threshold_hours acima de 720", async () => {
  const result = validatePayload(VaultCoverageWatchdogSchemaV1, {
    threshold_hours: 721,
  });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response, "threshold_hours");
});

Deno.test("vault-coverage-watchdog V1: rejeita campo desconhecido (strict)", async () => {
  const result = validatePayload(VaultCoverageWatchdogSchemaV1, {
    unknown: "campo",
  });
  assertEquals(result.success, false);
});

// ─────────────────────────────────────────────────────────────
// Testes de formato 422 unificado (cross-schema)
// ─────────────────────────────────────────────────────────────

Deno.test("422 response: todos os campos obrigatórios presentes no body", async () => {
  const result = validatePayload(IngestAuthSchemaV1, {});
  assertEquals(result.success, false);
  if (!result.success) {
    const body = await result.response.json();
    assertExists(body.code);
    assertExists(body.message);
    assertExists(body.fields);
    assertExists(body.contract_version);
    assertEquals(body.code, "VALIDATION_ERROR");
    assertEquals(typeof body.message, "string");
    assert(Array.isArray(body.fields));
  }
});

Deno.test("422 response: cada field tem 'field' e 'message'", async () => {
  const result = validatePayload(IngestAuthSchemaV1, {});
  assertEquals(result.success, false);
  if (!result.success) {
    const body = await result.response.json();
    for (const f of body.fields) {
      assertExists(f.field, "cada field deve ter 'field'");
      assertExists(f.message, "cada field deve ter 'message'");
      assertEquals(typeof f.field, "string");
      assertEquals(typeof f.message, "string");
    }
  }
});

Deno.test("422 response: contract_version v1 por padrão", async () => {
  const result = validatePayload(AgentRelayCompleteSchemaV1, {});
  assertEquals(result.success, false);
  if (!result.success) {
    const body = await result.response.json();
    assertEquals(body.contract_version, "v1");
  }
});

Deno.test("422 response: contract_version v2 quando especificado", async () => {
  const result = validatePayload(AgentRelayCompleteSchemaV1, {}, {}, "v2");
  assertEquals(result.success, false);
  if (!result.success) {
    const body = await result.response.json();
    assertEquals(body.contract_version, "v2");
  }
});

Deno.test("422 response: multiple errors reportados de uma vez", async () => {
  const result = validatePayload(PreviewTelemetryAlertSchemaV1, {});
  assertEquals(result.success, false);
  if (!result.success) {
    const body = await result.response.json();
    // Payload totalmente vazio deve gerar múltiplos erros (camera_id, alert_type, severity, metric, value)
    assert(body.fields.length >= 3, `Esperado >= 3 erros, recebido ${body.fields.length}`);
  }
});
