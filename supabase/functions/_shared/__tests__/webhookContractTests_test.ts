/**
 * Contract tests for all webhook schemas.
 * Tests valid/invalid payloads against Zod schemas and verifies 422 response shape.
 */
import { assertEquals, assertExists, assert } from 'https://deno.land/std@0.224.0/assert/mod.ts';
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
  StreamHealthProbeQuerySchema,
  PreviewTelemetryAlertQuerySchema,
  ConnectivityResolutionAlertQuerySchema,
  WatchdogAckSlaAlertSchemaV1,
  WatchdogAckSlaAlertQuerySchema,
  MonitoringCenterDispatchSchemaV1,
  VaultCoverageWatchdogQuerySchema,
} from '../webhookSchemas.ts';
import { validatePayload, validateVersionedPayload } from '../contractValidation.ts';

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';
const VALID_STREAM_KEY = 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4'; // 32 hex chars
const VALID_DATETIME = '2024-01-15T10:30:00+00:00';

async function assert422Shape(response: Response, expectedField?: string) {
  assertEquals(response.status, 422);
  const body = await response.json();
  assertEquals(body.code, 'VALIDATION_ERROR');
  assertExists(body.message);
  assert(Array.isArray(body.fields));
  assertExists(body.contract_version);
  if (expectedField) {
    assert(
      body.fields.some(
        (f: { field: string }) => f.field === expectedField || f.field.startsWith(expectedField)
      ),
      `Expected field "${expectedField}" in error fields: ${JSON.stringify(body.fields)}`
    );
  }
  return body;
}

// ─────────────────────────────────────────────────────────────
// ingest-auth — IngestAuthSchemaV1
// ─────────────────────────────────────────────────────────────

Deno.test('ingest-auth V1: aceita payload publish válido', () => {
  const result = IngestAuthSchemaV1.safeParse({
    action: 'publish',
    stream_key: VALID_STREAM_KEY,
  });
  assertEquals(result.success, true);
});

Deno.test('ingest-auth V1: aceita payload unpublish com todos os campos opcionais', () => {
  const result = IngestAuthSchemaV1.safeParse({
    action: 'unpublish',
    stream_key: VALID_STREAM_KEY,
    protocol: 'rtmp_push',
    client_ip: '192.168.1.1',
  });
  assertEquals(result.success, true);
});

Deno.test('ingest-auth V1: aceita protocol srt_push', () => {
  const result = IngestAuthSchemaV1.safeParse({
    action: 'publish',
    stream_key: VALID_STREAM_KEY,
    protocol: 'srt_push',
  });
  assertEquals(result.success, true);
});

Deno.test('ingest-auth V1: rejeita action inválida', async () => {
  const result = validatePayload(IngestAuthSchemaV1, {
    action: 'start',
    stream_key: VALID_STREAM_KEY,
  });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response, 'action');
});

Deno.test('ingest-auth V1: rejeita stream_key ausente', async () => {
  const result = validatePayload(IngestAuthSchemaV1, { action: 'publish' });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response, 'stream_key');
});

Deno.test('ingest-auth V1: rejeita stream_key com caracteres não-hex', async () => {
  const result = validatePayload(IngestAuthSchemaV1, {
    action: 'publish',
    stream_key: 'GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
  });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response, 'stream_key');
});

Deno.test('ingest-auth V1: rejeita stream_key muito curta (< 32 chars)', async () => {
  const result = validatePayload(IngestAuthSchemaV1, {
    action: 'publish',
    stream_key: 'a1b2c3d4',
  });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response, 'stream_key');
});

Deno.test('ingest-auth V1: rejeita stream_key muito longa (> 64 chars)', async () => {
  const result = validatePayload(IngestAuthSchemaV1, {
    action: 'publish',
    stream_key: 'a'.repeat(65),
  });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response, 'stream_key');
});

Deno.test('ingest-auth V1: rejeita protocol inválido', async () => {
  const result = validatePayload(IngestAuthSchemaV1, {
    action: 'publish',
    stream_key: VALID_STREAM_KEY,
    protocol: 'webrtc',
  });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response, 'protocol');
});

Deno.test('ingest-auth V1: rejeita campo desconhecido (strict)', async () => {
  const result = validatePayload(IngestAuthSchemaV1, {
    action: 'publish',
    stream_key: VALID_STREAM_KEY,
    unknown_field: 'x',
  });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response);
});

Deno.test('ingest-auth V1: rejeita payload vazio', async () => {
  const result = validatePayload(IngestAuthSchemaV1, {});
  assertEquals(result.success, false);
  if (!result.success) {
    const body = await assert422Shape(result.response);
    assert(body.fields.length >= 2);
  }
});

// ingest-auth V2

Deno.test('ingest-auth V2: aceita payload V1 sem campos adicionais (backward compat)', () => {
  const result = IngestAuthSchemaV2.safeParse({
    action: 'publish',
    stream_key: VALID_STREAM_KEY,
  });
  assertEquals(result.success, true);
});

Deno.test('ingest-auth V2: aceita session_id UUID', () => {
  const result = IngestAuthSchemaV2.safeParse({
    action: 'publish',
    stream_key: VALID_STREAM_KEY,
    session_id: VALID_UUID,
  });
  assertEquals(result.success, true);
});

Deno.test('ingest-auth V2: aceita metadata como record', () => {
  const result = IngestAuthSchemaV2.safeParse({
    action: 'publish',
    stream_key: VALID_STREAM_KEY,
    metadata: { region: 'br-south', quality: '720p' },
  });
  assertEquals(result.success, true);
});

Deno.test('ingest-auth V2: aceita metadata com exatamente 10 chaves', () => {
  const metadata: Record<string, string> = {};
  for (let i = 0; i < 10; i++) metadata[`key${i}`] = `val${i}`;
  const result = IngestAuthSchemaV2.safeParse({
    action: 'publish',
    stream_key: VALID_STREAM_KEY,
    metadata,
  });
  assertEquals(result.success, true);
});

Deno.test('ingest-auth V2: rejeita metadata com mais de 10 chaves', async () => {
  const metadata: Record<string, string> = {};
  for (let i = 0; i < 11; i++) metadata[`key${i}`] = `val${i}`;
  const result = validatePayload(IngestAuthSchemaV2, {
    action: 'publish',
    stream_key: VALID_STREAM_KEY,
    metadata,
  });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response, 'metadata');
});

Deno.test('ingest-auth V2: rejeita session_id inválido (não-UUID)', async () => {
  const result = validatePayload(IngestAuthSchemaV2, {
    action: 'publish',
    stream_key: VALID_STREAM_KEY,
    session_id: 'nao-e-uuid',
  });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response, 'session_id');
});

Deno.test('ingest-auth V2: rejeita metadata com valor longo (> 256 chars)', async () => {
  const result = validatePayload(IngestAuthSchemaV2, {
    action: 'publish',
    stream_key: VALID_STREAM_KEY,
    metadata: { key: 'x'.repeat(257) },
  });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response);
});

Deno.test('ingest-auth V2: rejeita campo desconhecido (strict)', async () => {
  const result = validatePayload(IngestAuthSchemaV2, {
    action: 'publish',
    stream_key: VALID_STREAM_KEY,
    extra_unknown: 'valor',
  });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response);
});

Deno.test('ingest-auth: versioned validation aceita V1 em endpoint V2', () => {
  const v1Payload = { action: 'publish', stream_key: VALID_STREAM_KEY };
  const result = validateVersionedPayload(
    { v1: IngestAuthSchemaV1, v2: IngestAuthSchemaV2 },
    v1Payload,
    'v2'
  );
  assertEquals(result.success, true);
});

// ─────────────────────────────────────────────────────────────
// csp-report
// ─────────────────────────────────────────────────────────────

Deno.test('csp-report legacy: aceita { csp-report: {...} }', () => {
  const result = CspReportLegacyBodySchema.safeParse({
    'csp-report': {
      'document-uri': 'https://example.com',
      'violated-directive': 'script-src',
    },
  });
  assertEquals(result.success, true);
});

Deno.test('csp-report legacy: aceita body sem csp-report (passthrough)', () => {
  const result = CspReportLegacyBodySchema.safeParse({ other: 'field' });
  assertEquals(result.success, true);
});

Deno.test('csp-report Reporting API: aceita item válido', () => {
  const result = CspReportingApiItemSchema.safeParse({
    type: 'csp-violation',
    body: { blockedURL: 'https://evil.com' },
    age: 100,
    url: 'https://example.com',
    user_agent: 'Mozilla/5.0',
  });
  assertEquals(result.success, true);
});

Deno.test('csp-report Reporting API: aceita item com apenas type e body', () => {
  const result = CspReportingApiItemSchema.safeParse({
    type: 'csp-violation',
    body: {},
  });
  assertEquals(result.success, true);
});

Deno.test('csp-report Reporting API: rejeita item sem type', async () => {
  const result = validatePayload(CspReportingApiItemSchema, {
    body: { blockedURL: 'x' },
  });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response, 'type');
});

Deno.test('csp-report Reporting API: rejeita item sem body', async () => {
  const result = validatePayload(CspReportingApiItemSchema, {
    type: 'csp-violation',
  });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response, 'body');
});

Deno.test('csp-report Reporting API: rejeita type vazio', async () => {
  const result = validatePayload(CspReportingApiItemSchema, {
    type: '',
    body: {},
  });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response, 'type');
});

Deno.test('csp-report Reporting API array: aceita array com um item', () => {
  const result = CspReportingApiArraySchema.safeParse([
    { type: 'csp-violation', body: { blockedURL: 'x' } },
  ]);
  assertEquals(result.success, true);
});

Deno.test('csp-report Reporting API array: rejeita array vazio', async () => {
  const result = validatePayload(CspReportingApiArraySchema, []);
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response);
});

// ─────────────────────────────────────────────────────────────
// agent-ingest — heartbeat
// ─────────────────────────────────────────────────────────────

Deno.test('agent heartbeat V1: aceita payload vazio (todos campos opcionais)', () => {
  const result = AgentHeartbeatSchemaV1.safeParse({});
  assertEquals(result.success, true);
});

Deno.test('agent heartbeat V1: aceita com todos os campos', () => {
  const result = AgentHeartbeatSchemaV1.safeParse({
    agent_version: '1.2.3',
    network_cidr: '192.168.1.0/24',
  });
  assertEquals(result.success, true);
});

Deno.test('agent heartbeat V1: rejeita agent_version muito longa', async () => {
  const result = validatePayload(AgentHeartbeatSchemaV1, {
    agent_version: 'v' + '1'.repeat(40),
  });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response, 'agent_version');
});

Deno.test('agent heartbeat V1: rejeita campo desconhecido (strict)', async () => {
  const result = validatePayload(AgentHeartbeatSchemaV1, {
    agent_version: '1.0.0',
    unknown: 'field',
  });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response);
});

Deno.test('agent heartbeat V2: aceita capabilities e region', () => {
  const result = AgentHeartbeatSchemaV2.safeParse({
    agent_version: '2.0.0',
    capabilities: ['onvif', 'rtsp', 'ptz'],
    region: 'br-south-1',
  });
  assertEquals(result.success, true);
});

Deno.test('agent heartbeat V2: aceita payload V1 sem campos adicionais', () => {
  const result = AgentHeartbeatSchemaV2.safeParse({ agent_version: '1.0.0' });
  assertEquals(result.success, true);
});

Deno.test('agent heartbeat V2: rejeita capabilities com string longa', async () => {
  const result = validatePayload(AgentHeartbeatSchemaV2, {
    capabilities: ['x'.repeat(65)],
  });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response, 'capabilities');
});

// ─────────────────────────────────────────────────────────────
// agent-ingest — discoveries
// ─────────────────────────────────────────────────────────────

const validDiscovery = {
  host: '192.168.1.100',
  port: 554,
  manufacturer: 'Hikvision',
  model: 'DS-2CD2142FWD',
  firmware: '5.6.2',
  onvif_endpoint: 'http://192.168.1.100/onvif/device_service',
  rtsp_primary: 'rtsp://192.168.1.100/live/main',
  rtsp_substream: 'rtsp://192.168.1.100/live/sub',
  ptz_capable: false,
  discovered_at: VALID_DATETIME,
};

Deno.test('agent discoveries: DiscoveryItemSchema aceita item completo', () => {
  const result = DiscoveryItemSchema.safeParse(validDiscovery);
  assertEquals(result.success, true);
});

Deno.test('agent discoveries: DiscoveryItemSchema aceita item mínimo', () => {
  const result = DiscoveryItemSchema.safeParse({ host: 'cam.local', port: 554 });
  assertEquals(result.success, true);
});

Deno.test('agent discoveries: DiscoveryItemSchema rejeita host ausente', async () => {
  const result = validatePayload(DiscoveryItemSchema, { port: 554 });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response, 'host');
});

Deno.test('agent discoveries: DiscoveryItemSchema rejeita host vazio', async () => {
  const result = validatePayload(DiscoveryItemSchema, { host: '', port: 554 });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response, 'host');
});

Deno.test('agent discoveries: DiscoveryItemSchema rejeita port ausente', async () => {
  const result = validatePayload(DiscoveryItemSchema, { host: 'cam.local' });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response, 'port');
});

Deno.test('agent discoveries: DiscoveryItemSchema rejeita port fora do range (0)', async () => {
  const result = validatePayload(DiscoveryItemSchema, { host: 'cam.local', port: 0 });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response, 'port');
});

Deno.test('agent discoveries: DiscoveryItemSchema rejeita port fora do range (65536)', async () => {
  const result = validatePayload(DiscoveryItemSchema, { host: 'cam.local', port: 65536 });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response, 'port');
});

Deno.test('agent discoveries: DiscoveryItemSchema rejeita port não-inteiro', async () => {
  const result = validatePayload(DiscoveryItemSchema, { host: 'cam.local', port: 554.5 });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response, 'port');
});

Deno.test('agent discoveries: DiscoveryItemSchema rejeita port NaN', async () => {
  const result = validatePayload(DiscoveryItemSchema, { host: 'cam.local', port: NaN });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response, 'port');
});

Deno.test('agent discoveries: DiscoveryItemSchema rejeita port Infinity', async () => {
  const result = validatePayload(DiscoveryItemSchema, { host: 'cam.local', port: Infinity });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response, 'port');
});

Deno.test(
  'agent discoveries: DiscoveryItemSchema rejeita onvif_endpoint URL inválida',
  async () => {
    const result = validatePayload(DiscoveryItemSchema, {
      host: 'cam.local',
      port: 554,
      onvif_endpoint: 'nao-e-url',
    });
    assertEquals(result.success, false);
    if (!result.success) await assert422Shape(result.response, 'onvif_endpoint');
  }
);

Deno.test('agent discoveries: DiscoveryItemSchema aceita onvif_endpoint null', () => {
  const result = DiscoveryItemSchema.safeParse({
    host: 'cam.local',
    port: 554,
    onvif_endpoint: null,
  });
  assertEquals(result.success, true);
});

// DiscoveryItemSchema: min(1) enforcement on optional nullish string fields
// These fields are .nullish() so null/undefined are valid, but "" (empty string) must be rejected.
// This prevents database entries with empty strings masquerading as valid metadata.

Deno.test(
  "agent discoveries: DiscoveryItemSchema rejeita manufacturer = '' (string vazia)",
  async () => {
    const result = validatePayload(DiscoveryItemSchema, {
      host: 'cam.local',
      port: 554,
      manufacturer: '',
    });
    assertEquals(result.success, false);
    if (!result.success) await assert422Shape(result.response, 'manufacturer');
  }
);

Deno.test('agent discoveries: DiscoveryItemSchema aceita manufacturer = null', () => {
  const result = DiscoveryItemSchema.safeParse({
    host: 'cam.local',
    port: 554,
    manufacturer: null,
  });
  assertEquals(result.success, true);
});

Deno.test("agent discoveries: DiscoveryItemSchema rejeita model = '' (string vazia)", async () => {
  const result = validatePayload(DiscoveryItemSchema, { host: 'cam.local', port: 554, model: '' });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response, 'model');
});

Deno.test(
  "agent discoveries: DiscoveryItemSchema rejeita firmware = '' (string vazia)",
  async () => {
    const result = validatePayload(DiscoveryItemSchema, {
      host: 'cam.local',
      port: 554,
      firmware: '',
    });
    assertEquals(result.success, false);
    if (!result.success) await assert422Shape(result.response, 'firmware');
  }
);

Deno.test(
  "agent discoveries: DiscoveryItemSchema rejeita rtsp_primary = '' (string vazia)",
  async () => {
    const result = validatePayload(DiscoveryItemSchema, {
      host: 'cam.local',
      port: 554,
      rtsp_primary: '',
    });
    assertEquals(result.success, false);
    if (!result.success) await assert422Shape(result.response, 'rtsp_primary');
  }
);

Deno.test(
  "agent discoveries: DiscoveryItemSchema rejeita rtsp_substream = '' (string vazia)",
  async () => {
    const result = validatePayload(DiscoveryItemSchema, {
      host: 'cam.local',
      port: 554,
      rtsp_substream: '',
    });
    assertEquals(result.success, false);
    if (!result.success) await assert422Shape(result.response, 'rtsp_substream');
  }
);

Deno.test('agent discoveries V1: aceita lista com uma câmera', () => {
  const result = AgentDiscoveriesSchemaV1.safeParse({
    discoveries: [{ host: 'cam.local', port: 554 }],
  });
  assertEquals(result.success, true);
});

Deno.test('agent discoveries V1: rejeita lista vazia', async () => {
  const result = validatePayload(AgentDiscoveriesSchemaV1, { discoveries: [] });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response, 'discoveries');
});

Deno.test('agent discoveries V1: rejeita discoveries ausente', async () => {
  const result = validatePayload(AgentDiscoveriesSchemaV1, {});
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response, 'discoveries');
});

Deno.test('agent discoveries V1: rejeita discoveries com mais de 128 itens', async () => {
  const result = validatePayload(AgentDiscoveriesSchemaV1, {
    discoveries: Array.from({ length: 129 }, (_, i) => ({
      host: `cam${i}.local`,
      port: 554,
    })),
  });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response, 'discoveries');
});

Deno.test('agent discoveries V1: rejeita item com tipo incorreto em host', async () => {
  const result = validatePayload(AgentDiscoveriesSchemaV1, {
    discoveries: [{ host: 12345, port: 554 }],
  });
  assertEquals(result.success, false);
  if (!result.success) {
    const body = await assert422Shape(result.response);
    assert(body.fields.some((f: { field: string }) => f.field.includes('host')));
  }
});

Deno.test('agent discoveries V2: aceita source e scan_duration_ms', () => {
  const result = AgentDiscoveriesSchemaV2.safeParse({
    discoveries: [{ host: 'cam.local', port: 554 }],
    source: 'onvif',
    scan_duration_ms: 5000,
  });
  assertEquals(result.success, true);
});

Deno.test('agent discoveries V2: rejeita source inválida', async () => {
  const result = validatePayload(AgentDiscoveriesSchemaV2, {
    discoveries: [{ host: 'cam.local', port: 554 }],
    source: 'zeroconf',
  });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response, 'source');
});

Deno.test('agent discoveries V2: rejeita campo desconhecido (strict)', async () => {
  const result = validatePayload(AgentDiscoveriesSchemaV2, {
    discoveries: [{ host: 'cam.local', port: 554 }],
    extra_field: 'valor',
  });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response);
});

// ─────────────────────────────────────────────────────────────
// agent-ingest — relay-poll
// Schema: { max?: number (int, 1-8) }
// ─────────────────────────────────────────────────────────────

Deno.test('agent relay-poll: aceita payload vazio', () => {
  const result = AgentRelayPollSchema.safeParse({});
  assertEquals(result.success, true);
});

Deno.test('agent relay-poll: aceita max válido (4)', () => {
  const result = AgentRelayPollSchema.safeParse({ max: 4 });
  assertEquals(result.success, true);
});

Deno.test('agent relay-poll: aceita max = 1 (mínimo)', () => {
  const result = AgentRelayPollSchema.safeParse({ max: 1 });
  assertEquals(result.success, true);
});

Deno.test('agent relay-poll: aceita max = 8 (máximo)', () => {
  const result = AgentRelayPollSchema.safeParse({ max: 8 });
  assertEquals(result.success, true);
});

Deno.test('agent relay-poll: rejeita max = 0 (abaixo do mínimo)', async () => {
  const result = validatePayload(AgentRelayPollSchema, { max: 0 });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response, 'max');
});

Deno.test('agent relay-poll: rejeita max = 9 (acima do máximo)', async () => {
  const result = validatePayload(AgentRelayPollSchema, { max: 9 });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response, 'max');
});

Deno.test('agent relay-poll: rejeita max decimal', async () => {
  const result = validatePayload(AgentRelayPollSchema, { max: 3.5 });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response, 'max');
});

Deno.test('agent relay-poll: rejeita max NaN', async () => {
  const result = validatePayload(AgentRelayPollSchema, { max: NaN });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response, 'max');
});

Deno.test('agent relay-poll: rejeita campo desconhecido (strict)', async () => {
  const result = validatePayload(AgentRelayPollSchema, { unknown: 'x' });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response);
});

// ─────────────────────────────────────────────────────────────
// agent-ingest — relay-complete
// Schema V1: { task_id: string(1-128), response?: unknown, error?: string(max 500) }
// Schema V2: V1 + { exit_code?: int(-2147483648..2147483647), duration_ms?: int(min 0) }
// ─────────────────────────────────────────────────────────────

Deno.test('agent relay-complete V1: aceita payload mínimo (só task_id)', () => {
  const result = AgentRelayCompleteSchemaV1.safeParse({ task_id: 'task-abc-123' });
  assertEquals(result.success, true);
});

Deno.test('agent relay-complete V1: aceita com response e error opcionais', () => {
  const result = AgentRelayCompleteSchemaV1.safeParse({
    task_id: 'task-abc-123',
    response: { output: 'ok', code: 0 },
    error: 'stderr message',
  });
  assertEquals(result.success, true);
});

Deno.test('agent relay-complete V1: aceita response como string', () => {
  const result = AgentRelayCompleteSchemaV1.safeParse({
    task_id: 'task-abc-123',
    response: 'resultado em texto',
  });
  assertEquals(result.success, true);
});

Deno.test('agent relay-complete V1: aceita response null', () => {
  const result = AgentRelayCompleteSchemaV1.safeParse({
    task_id: 'task-abc-123',
    response: null,
  });
  assertEquals(result.success, true);
});

Deno.test('agent relay-complete V1: rejeita task_id ausente', async () => {
  const result = validatePayload(AgentRelayCompleteSchemaV1, {});
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response, 'task_id');
});

Deno.test('agent relay-complete V1: rejeita task_id vazio', async () => {
  const result = validatePayload(AgentRelayCompleteSchemaV1, { task_id: '' });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response, 'task_id');
});

Deno.test('agent relay-complete V1: rejeita task_id acima de 128 chars', async () => {
  const result = validatePayload(AgentRelayCompleteSchemaV1, {
    task_id: 't'.repeat(129),
  });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response, 'task_id');
});

Deno.test('agent relay-complete V1: rejeita error acima de 500 chars', async () => {
  const result = validatePayload(AgentRelayCompleteSchemaV1, {
    task_id: 'task-abc-123',
    error: 'e'.repeat(501),
  });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response, 'error');
});

Deno.test('agent relay-complete V1: rejeita campo desconhecido (strict)', async () => {
  const result = validatePayload(AgentRelayCompleteSchemaV1, {
    task_id: 'task-abc-123',
    unknown_field: 'x',
  });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response);
});

Deno.test('agent relay-complete V2: aceita exit_code e duration_ms', () => {
  const result = AgentRelayCompleteSchemaV2.safeParse({
    task_id: 'task-abc-123',
    exit_code: 0,
    duration_ms: 1500,
  });
  assertEquals(result.success, true);
});

Deno.test('agent relay-complete V2: aceita payload V1 (backward compat)', () => {
  const result = AgentRelayCompleteSchemaV2.safeParse({ task_id: 'task-abc-123' });
  assertEquals(result.success, true);
});

Deno.test('agent relay-complete V2: aceita exit_code negativo válido (-1)', () => {
  const result = AgentRelayCompleteSchemaV2.safeParse({
    task_id: 'task-abc-123',
    exit_code: -1,
  });
  assertEquals(result.success, true);
});

Deno.test('agent relay-complete V2: aceita exit_code no limite int32 mínimo', () => {
  const result = AgentRelayCompleteSchemaV2.safeParse({
    task_id: 'task-abc-123',
    exit_code: -2_147_483_648,
  });
  assertEquals(result.success, true);
});

Deno.test('agent relay-complete V2: aceita exit_code no limite int32 máximo', () => {
  const result = AgentRelayCompleteSchemaV2.safeParse({
    task_id: 'task-abc-123',
    exit_code: 2_147_483_647,
  });
  assertEquals(result.success, true);
});

Deno.test('agent relay-complete V2: rejeita exit_code abaixo de int32 mínimo', async () => {
  const result = validatePayload(AgentRelayCompleteSchemaV2, {
    task_id: 'task-abc-123',
    exit_code: -2_147_483_649,
  });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response, 'exit_code');
});

Deno.test('agent relay-complete V2: rejeita exit_code acima de int32 máximo', async () => {
  const result = validatePayload(AgentRelayCompleteSchemaV2, {
    task_id: 'task-abc-123',
    exit_code: 2_147_483_648,
  });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response, 'exit_code');
});

Deno.test('agent relay-complete V2: rejeita duration_ms negativo', async () => {
  const result = validatePayload(AgentRelayCompleteSchemaV2, {
    task_id: 'task-abc-123',
    duration_ms: -1,
  });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response, 'duration_ms');
});

Deno.test('agent relay-complete V2: rejeita exit_code decimal', async () => {
  const result = validatePayload(AgentRelayCompleteSchemaV2, {
    task_id: 'task-abc-123',
    exit_code: 1.5,
  });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response, 'exit_code');
});

Deno.test('agent relay-complete V2: rejeita campo desconhecido (strict)', async () => {
  const result = validatePayload(AgentRelayCompleteSchemaV2, {
    task_id: 'task-abc-123',
    extra_field: 'x',
  });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response);
});

Deno.test('agent relay-complete: versioned validation aceita V1 em endpoint V2', () => {
  const v1Payload = { task_id: 'task-abc-123' };
  const result = validateVersionedPayload(
    { v1: AgentRelayCompleteSchemaV1, v2: AgentRelayCompleteSchemaV2 },
    v1Payload,
    'v2'
  );
  assertEquals(result.success, true);
});

// ─────────────────────────────────────────────────────────────
// stream-health-probe — query params only
// Schema: { limit?: int(1-200) }
// ─────────────────────────────────────────────────────────────

Deno.test('stream-health-probe query: aceita objeto vazio (batch sem filtro)', () => {
  const result = StreamHealthProbeQuerySchema.safeParse({});
  assertEquals(result.success, true);
});

Deno.test('stream-health-probe query: aceita limit válido', () => {
  const result = StreamHealthProbeQuerySchema.safeParse({ limit: 50 });
  assertEquals(result.success, true);
});

Deno.test('stream-health-probe query: aceita limit = 1 (mínimo)', () => {
  const result = StreamHealthProbeQuerySchema.safeParse({ limit: 1 });
  assertEquals(result.success, true);
});

Deno.test('stream-health-probe query: aceita limit = 200 (máximo)', () => {
  const result = StreamHealthProbeQuerySchema.safeParse({ limit: 200 });
  assertEquals(result.success, true);
});

Deno.test('stream-health-probe query: rejeita limit = 0', async () => {
  const result = validatePayload(StreamHealthProbeQuerySchema, { limit: 0 });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response, 'limit');
});

Deno.test('stream-health-probe query: rejeita limit = 201', async () => {
  const result = validatePayload(StreamHealthProbeQuerySchema, { limit: 201 });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response, 'limit');
});

Deno.test('stream-health-probe query: rejeita limit decimal', async () => {
  const result = validatePayload(StreamHealthProbeQuerySchema, { limit: 50.5 });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response, 'limit');
});

Deno.test('stream-health-probe query: rejeita campo desconhecido (strict)', async () => {
  const result = validatePayload(StreamHealthProbeQuerySchema, { camera_id: VALID_UUID });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response);
});

// ─────────────────────────────────────────────────────────────
// preview-telemetry-alert — query params only
// Schema: { window?: int(1-1440), min?: int(1+), threshold?: number }
// ─────────────────────────────────────────────────────────────

Deno.test('preview-telemetry-alert query: aceita objeto vazio', () => {
  const result = PreviewTelemetryAlertQuerySchema.safeParse({});
  assertEquals(result.success, true);
});

Deno.test('preview-telemetry-alert query: aceita com todos os campos', () => {
  const result = PreviewTelemetryAlertQuerySchema.safeParse({
    window: 60,
    min: 5,
    threshold: 0.8,
  });
  assertEquals(result.success, true);
});

Deno.test('preview-telemetry-alert query: aceita window = 1440 (máximo)', () => {
  const result = PreviewTelemetryAlertQuerySchema.safeParse({ window: 1440 });
  assertEquals(result.success, true);
});

Deno.test('preview-telemetry-alert query: rejeita window = 0', async () => {
  const result = validatePayload(PreviewTelemetryAlertQuerySchema, { window: 0 });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response, 'window');
});

Deno.test('preview-telemetry-alert query: rejeita window = 1441', async () => {
  const result = validatePayload(PreviewTelemetryAlertQuerySchema, { window: 1441 });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response, 'window');
});

Deno.test('preview-telemetry-alert query: rejeita min = 0', async () => {
  const result = validatePayload(PreviewTelemetryAlertQuerySchema, { min: 0 });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response, 'min');
});

Deno.test('preview-telemetry-alert query: rejeita campo desconhecido (strict)', async () => {
  const result = validatePayload(PreviewTelemetryAlertQuerySchema, { camera_id: VALID_UUID });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response);
});

// ─────────────────────────────────────────────────────────────
// connectivity-resolution-alert — query params only
// Schema: { window?: int(1-1440), min?: int(1+), threshold?: number }
// ─────────────────────────────────────────────────────────────

Deno.test('connectivity-resolution-alert query: aceita objeto vazio', () => {
  const result = ConnectivityResolutionAlertQuerySchema.safeParse({});
  assertEquals(result.success, true);
});

Deno.test('connectivity-resolution-alert query: aceita com todos os campos', () => {
  const result = ConnectivityResolutionAlertQuerySchema.safeParse({
    window: 30,
    min: 3,
    threshold: 0.5,
  });
  assertEquals(result.success, true);
});

Deno.test('connectivity-resolution-alert query: rejeita window = 0', async () => {
  const result = validatePayload(ConnectivityResolutionAlertQuerySchema, { window: 0 });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response, 'window');
});

Deno.test('connectivity-resolution-alert query: rejeita min negativo', async () => {
  const result = validatePayload(ConnectivityResolutionAlertQuerySchema, { min: -1 });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response, 'min');
});

Deno.test('connectivity-resolution-alert query: rejeita campo desconhecido (strict)', async () => {
  const result = validatePayload(ConnectivityResolutionAlertQuerySchema, {
    resolution_type: 'timeout',
  });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response);
});

// ─────────────────────────────────────────────────────────────
// watchdog-ack-sla-alert
// Schema: { force?: boolean, min_ack?: int(min 0), min_esc?: int(min 0), mtta_cap_min?: int(min 0) }
// ─────────────────────────────────────────────────────────────

Deno.test('watchdog-ack-sla-alert V1: aceita payload vazio (todos opcionais)', () => {
  const result = WatchdogAckSlaAlertSchemaV1.safeParse({});
  assertEquals(result.success, true);
});

Deno.test('watchdog-ack-sla-alert V1: aceita com todos os campos', () => {
  const result = WatchdogAckSlaAlertSchemaV1.safeParse({
    force: true,
    min_ack: 5,
    min_esc: 10,
    mtta_cap_min: 30,
  });
  assertEquals(result.success, true);
});

Deno.test('watchdog-ack-sla-alert V1: aceita force = false', () => {
  const result = WatchdogAckSlaAlertSchemaV1.safeParse({ force: false });
  assertEquals(result.success, true);
});

Deno.test('watchdog-ack-sla-alert V1: aceita min_ack = 0 (mínimo)', () => {
  const result = WatchdogAckSlaAlertSchemaV1.safeParse({ min_ack: 0 });
  assertEquals(result.success, true);
});

Deno.test('watchdog-ack-sla-alert V1: rejeita min_ack negativo', async () => {
  const result = validatePayload(WatchdogAckSlaAlertSchemaV1, { min_ack: -1 });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response, 'min_ack');
});

Deno.test('watchdog-ack-sla-alert V1: rejeita min_esc negativo', async () => {
  const result = validatePayload(WatchdogAckSlaAlertSchemaV1, { min_esc: -5 });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response, 'min_esc');
});

Deno.test('watchdog-ack-sla-alert V1: rejeita mtta_cap_min negativo', async () => {
  const result = validatePayload(WatchdogAckSlaAlertSchemaV1, { mtta_cap_min: -1 });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response, 'mtta_cap_min');
});

Deno.test('watchdog-ack-sla-alert V1: rejeita force como string', async () => {
  const result = validatePayload(WatchdogAckSlaAlertSchemaV1, { force: 'true' });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response, 'force');
});

Deno.test('watchdog-ack-sla-alert V1: rejeita campo desconhecido (strict)', async () => {
  const result = validatePayload(WatchdogAckSlaAlertSchemaV1, { extra: 'campo' });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response);
});

Deno.test('watchdog-ack-sla-alert V1: aceita min_ack = 10080 (máximo)', () => {
  const result = WatchdogAckSlaAlertSchemaV1.safeParse({ min_ack: 10080 });
  assertEquals(result.success, true);
});

Deno.test('watchdog-ack-sla-alert V1: rejeita min_ack = 10081 (acima do máximo)', async () => {
  const result = validatePayload(WatchdogAckSlaAlertSchemaV1, { min_ack: 10081 });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response, 'min_ack');
});

Deno.test('watchdog-ack-sla-alert V1: rejeita mtta_cap_min = 10081 (acima do máximo)', async () => {
  const result = validatePayload(WatchdogAckSlaAlertSchemaV1, { mtta_cap_min: 10081 });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response, 'mtta_cap_min');
});

// ─────────────────────────────────────────────────────────────
// watchdog-ack-sla-alert — query param variant (GET)
// Schema: WatchdogAckSlaAlertQuerySchema — z.coerce para string→number
// Protege contra NaN causado por valores não-numéricos em query params
// ─────────────────────────────────────────────────────────────

Deno.test('watchdog-ack-sla-alert query: aceita params vazios (GET sem query string)', () => {
  const result = WatchdogAckSlaAlertQuerySchema.safeParse({});
  assertEquals(result.success, true);
});

Deno.test("watchdog-ack-sla-alert query: aceita force = '1' (string)", () => {
  const result = WatchdogAckSlaAlertQuerySchema.safeParse({ force: '1' });
  assertEquals(result.success, true);
  if (result.success) assertEquals(result.data.force, '1');
});

Deno.test("watchdog-ack-sla-alert query: aceita force = '0' (string)", () => {
  const result = WatchdogAckSlaAlertQuerySchema.safeParse({ force: '0' });
  assertEquals(result.success, true);
});

Deno.test('watchdog-ack-sla-alert query: aceita min_ack como string numérica válida', () => {
  const result = WatchdogAckSlaAlertQuerySchema.safeParse({ min_ack: '70' });
  assertEquals(result.success, true);
  if (result.success) assertEquals(result.data.min_ack, 70);
});

Deno.test('watchdog-ack-sla-alert query: aceita todos os params com coerção', () => {
  const result = WatchdogAckSlaAlertQuerySchema.safeParse({
    force: '1',
    min_ack: '80',
    min_esc: '5',
    mtta_cap_min: '45',
  });
  assertEquals(result.success, true);
  if (result.success) {
    assertEquals(result.data.min_ack, 80);
    assertEquals(result.data.min_esc, 5);
    assertEquals(result.data.mtta_cap_min, 45);
  }
});

Deno.test("watchdog-ack-sla-alert query: aceita min_ack = '0' (mínimo)", () => {
  const result = WatchdogAckSlaAlertQuerySchema.safeParse({ min_ack: '0' });
  assertEquals(result.success, true);
  if (result.success) assertEquals(result.data.min_ack, 0);
});

Deno.test("watchdog-ack-sla-alert query: aceita min_ack = '10080' (máximo)", () => {
  const result = WatchdogAckSlaAlertQuerySchema.safeParse({ min_ack: '10080' });
  assertEquals(result.success, true);
  if (result.success) assertEquals(result.data.min_ack, 10080);
});

// NaN protection — valores não-numéricos que causavam NaN antes da correção
Deno.test("watchdog-ack-sla-alert query: rejeita min_ack = 'abc' (NaN-inducing)", async () => {
  const result = validatePayload(WatchdogAckSlaAlertQuerySchema, { min_ack: 'abc' });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response, 'min_ack');
});

Deno.test("watchdog-ack-sla-alert query: rejeita min_esc = 'abc' (NaN-inducing)", async () => {
  const result = validatePayload(WatchdogAckSlaAlertQuerySchema, { min_esc: 'abc' });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response, 'min_esc');
});

Deno.test("watchdog-ack-sla-alert query: rejeita mtta_cap_min = 'abc' (NaN-inducing)", async () => {
  const result = validatePayload(WatchdogAckSlaAlertQuerySchema, { mtta_cap_min: 'abc' });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response, 'mtta_cap_min');
});

Deno.test("watchdog-ack-sla-alert query: aceita min_ack = '' (string vazia coerge para 0)", () => {
  // Number("") === 0, portanto "" coerge para 0 (dentro do intervalo [0,10080])
  const result = WatchdogAckSlaAlertQuerySchema.safeParse({ min_ack: '' });
  assertEquals(result.success, true);
  if (result.success) assertEquals(result.data.min_ack, 0);
});

Deno.test("watchdog-ack-sla-alert query: rejeita min_ack = '10081' (acima do máximo)", async () => {
  const result = validatePayload(WatchdogAckSlaAlertQuerySchema, { min_ack: '10081' });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response, 'min_ack');
});

Deno.test("watchdog-ack-sla-alert query: rejeita min_ack = '-1' (negativo)", async () => {
  const result = validatePayload(WatchdogAckSlaAlertQuerySchema, { min_ack: '-1' });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response, 'min_ack');
});

Deno.test("watchdog-ack-sla-alert query: rejeita min_ack = '70.5' (decimal)", async () => {
  const result = validatePayload(WatchdogAckSlaAlertQuerySchema, { min_ack: '70.5' });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response, 'min_ack');
});

Deno.test(
  "watchdog-ack-sla-alert query: rejeita min_ack = 'Infinity' (Infinity-inducing)",
  async () => {
    const result = validatePayload(WatchdogAckSlaAlertQuerySchema, { min_ack: 'Infinity' });
    assertEquals(result.success, false);
    if (!result.success) await assert422Shape(result.response, 'min_ack');
  }
);

Deno.test('watchdog-ack-sla-alert query: rejeita campo desconhecido (strict)', async () => {
  const result = validatePayload(WatchdogAckSlaAlertQuerySchema, { unknown_param: 'val' });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response);
});

// ─────────────────────────────────────────────────────────────
// monitoring-center-dispatch
// Schema: { limit?: int(1-100) }
// ─────────────────────────────────────────────────────────────

Deno.test('monitoring-center-dispatch V1: aceita payload vazio', () => {
  const result = MonitoringCenterDispatchSchemaV1.safeParse({});
  assertEquals(result.success, true);
});

Deno.test('monitoring-center-dispatch V1: aceita limit válido', () => {
  const result = MonitoringCenterDispatchSchemaV1.safeParse({ limit: 50 });
  assertEquals(result.success, true);
});

Deno.test('monitoring-center-dispatch V1: aceita limit = 1 (mínimo)', () => {
  const result = MonitoringCenterDispatchSchemaV1.safeParse({ limit: 1 });
  assertEquals(result.success, true);
});

Deno.test('monitoring-center-dispatch V1: aceita limit = 100 (máximo)', () => {
  const result = MonitoringCenterDispatchSchemaV1.safeParse({ limit: 100 });
  assertEquals(result.success, true);
});

Deno.test('monitoring-center-dispatch V1: rejeita limit = 0', async () => {
  const result = validatePayload(MonitoringCenterDispatchSchemaV1, { limit: 0 });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response, 'limit');
});

Deno.test('monitoring-center-dispatch V1: rejeita limit = 101', async () => {
  const result = validatePayload(MonitoringCenterDispatchSchemaV1, { limit: 101 });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response, 'limit');
});

Deno.test('monitoring-center-dispatch V1: rejeita limit decimal', async () => {
  const result = validatePayload(MonitoringCenterDispatchSchemaV1, { limit: 10.5 });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response, 'limit');
});

Deno.test('monitoring-center-dispatch V1: rejeita campo desconhecido (strict)', async () => {
  const result = validatePayload(MonitoringCenterDispatchSchemaV1, { alert_id: VALID_UUID });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response);
});

// ─────────────────────────────────────────────────────────────
// vault-coverage-watchdog — query params only
// Schema: z.object({}).strict() — sem campos permitidos; rejeita qualquer param
// (schema intencionalmente vazio: função lê aggregate view sem parâmetros externos)
// ─────────────────────────────────────────────────────────────

Deno.test('vault-coverage-watchdog query: aceita objeto vazio', () => {
  const result = VaultCoverageWatchdogQuerySchema.safeParse({});
  assertEquals(result.success, true);
});

Deno.test(
  'vault-coverage-watchdog query: rejeita limit (campo não permitido pelo schema vazio)',
  async () => {
    const result = validatePayload(VaultCoverageWatchdogQuerySchema, { limit: 100 });
    assertEquals(result.success, false);
    if (!result.success) await assert422Shape(result.response);
  }
);

Deno.test('vault-coverage-watchdog query: rejeita limit = 0 (campo não permitido)', async () => {
  const result = validatePayload(VaultCoverageWatchdogQuerySchema, { limit: 0 });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response);
});

Deno.test('vault-coverage-watchdog query: rejeita campo desconhecido (strict)', async () => {
  const result = validatePayload(VaultCoverageWatchdogQuerySchema, { camera_ids: [VALID_UUID] });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response);
});

// ─────────────────────────────────────────────────────────────
// Testes de formato 422 unificado (cross-schema)
// ─────────────────────────────────────────────────────────────

Deno.test('422 response: todos os campos obrigatórios presentes no body', async () => {
  const result = validatePayload(IngestAuthSchemaV1, {});
  assertEquals(result.success, false);
  if (!result.success) {
    const body = await result.response.json();
    assertExists(body.code);
    assertExists(body.message);
    assertExists(body.fields);
    assertExists(body.contract_version);
    assertEquals(body.code, 'VALIDATION_ERROR');
    assertEquals(typeof body.message, 'string');
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
      assertEquals(typeof f.field, 'string');
      assertEquals(typeof f.message, 'string');
    }
  }
});

Deno.test('422 response: contract_version v1 por padrão', async () => {
  const result = validatePayload(AgentRelayCompleteSchemaV1, {});
  assertEquals(result.success, false);
  if (!result.success) {
    const body = await result.response.json();
    assertEquals(body.contract_version, 'v1');
  }
});

Deno.test('422 response: contract_version v2 quando especificado', async () => {
  const result = validatePayload(AgentRelayCompleteSchemaV1, {}, {}, 'v2');
  assertEquals(result.success, false);
  if (!result.success) {
    const body = await result.response.json();
    assertEquals(body.contract_version, 'v2');
  }
});

Deno.test('422 response: multiple errors reportados de uma vez', async () => {
  // IngestAuthSchemaV1 requer action e stream_key; payload vazio gera >= 2 erros
  const result = validatePayload(IngestAuthSchemaV1, {});
  assertEquals(result.success, false);
  if (!result.success) {
    const body = await result.response.json();
    assert(body.fields.length >= 2, `Esperado >= 2 erros, recebido ${body.fields.length}`);
  }
});

Deno.test('422 response: received incluído para enum inválido em v2', async () => {
  const result = validatePayload(
    IngestAuthSchemaV1,
    { action: 'invalid_action', stream_key: VALID_STREAM_KEY },
    {},
    'v2'
  );
  assertEquals(result.success, false);
  if (!result.success) {
    const body = await result.response.json();
    const actionField = body.fields.find((f: { field: string }) => f.field === 'action');
    assertExists(actionField);
    assertExists(actionField.received, "v2 deve incluir 'received' para enum inválido");
    assertEquals(actionField.received, 'invalid_action');
  }
});

// ─────────────────────────────────────────────────────────────
// Boundary tests: port, stream_key, duration_ms
// ─────────────────────────────────────────────────────────────

Deno.test('agent discoveries: DiscoveryItemSchema aceita port = 1 (mínimo válido)', () => {
  const result = DiscoveryItemSchema.safeParse({ host: 'cam.local', port: 1 });
  assertEquals(result.success, true);
});

Deno.test('agent discoveries: DiscoveryItemSchema aceita port = 65535 (máximo válido)', () => {
  const result = DiscoveryItemSchema.safeParse({ host: 'cam.local', port: 65535 });
  assertEquals(result.success, true);
});

Deno.test('agent discoveries: DiscoveryItemSchema rejeita port = 0 (abaixo do mínimo)', () => {
  const result = DiscoveryItemSchema.safeParse({ host: 'cam.local', port: 0 });
  assertEquals(result.success, false);
});

Deno.test('agent discoveries: DiscoveryItemSchema rejeita port = 65536 (acima do máximo)', () => {
  const result = DiscoveryItemSchema.safeParse({ host: 'cam.local', port: 65536 });
  assertEquals(result.success, false);
});

Deno.test(
  'ingest-auth V1: rejeita stream_key de exatamente 31 chars (abaixo do mínimo hex)',
  () => {
    const result = IngestAuthSchemaV1.safeParse({
      action: 'publish',
      stream_key: 'a'.repeat(31),
    });
    assertEquals(result.success, false);
  }
);

Deno.test('ingest-auth V1: aceita stream_key de exatamente 32 chars (mínimo válido)', () => {
  const result = IngestAuthSchemaV1.safeParse({
    action: 'publish',
    stream_key: 'a1b2c3d4'.repeat(4),
  });
  assertEquals(result.success, true);
});

Deno.test('ingest-auth V1: aceita stream_key de exatamente 64 chars (máximo válido)', () => {
  const result = IngestAuthSchemaV1.safeParse({
    action: 'publish',
    stream_key: 'a1b2c3d4'.repeat(8),
  });
  assertEquals(result.success, true);
});

// ─────────────────────────────────────────────────────────────
// Testes de regressão para correções de schema (Onda webhook-edge-functions-schema)
// ─────────────────────────────────────────────────────────────

Deno.test('ingest-auth V2: rejeita metadata com chave acima de 64 chars', async () => {
  const longKey = 'k'.repeat(65);
  const result = validatePayload(IngestAuthSchemaV2, {
    action: 'publish',
    stream_key: VALID_STREAM_KEY,
    metadata: { [longKey]: 'valor' },
  });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response, 'metadata');
});

Deno.test('ingest-auth V2: aceita metadata com chave de exatamente 64 chars', () => {
  const maxKey = 'k'.repeat(64);
  const result = IngestAuthSchemaV2.safeParse({
    action: 'publish',
    stream_key: VALID_STREAM_KEY,
    metadata: { [maxKey]: 'valor' },
  });
  assertEquals(result.success, true);
});

Deno.test('ingest-auth V2: rejeita metadata com chave de 65 chars (acima do máximo)', async () => {
  const overKey = 'k'.repeat(65);
  const result = validatePayload(IngestAuthSchemaV2, {
    action: 'publish',
    stream_key: VALID_STREAM_KEY,
    metadata: { [overKey]: 'valor' },
  });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response);
});

Deno.test('ingest-auth V2: rejeita metadata com chave vazia (min 1)', async () => {
  // z.record(z.string().min(1).max(64), ...) deve rejeitar chave ""
  const result = validatePayload(IngestAuthSchemaV2, {
    action: 'publish',
    stream_key: VALID_STREAM_KEY,
    metadata: { '': 'valor' },
  });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response);
});

Deno.test('ingest-auth V2: aceita metadata com chave de 1 char (mínimo válido)', () => {
  const result = IngestAuthSchemaV2.safeParse({
    action: 'publish',
    stream_key: VALID_STREAM_KEY,
    metadata: { k: 'valor' },
  });
  assertEquals(result.success, true);
});

Deno.test('agent heartbeat V2: rejeita capabilities com string vazia', async () => {
  const result = validatePayload(AgentHeartbeatSchemaV2, {
    capabilities: ['scanner', ''],
  });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response, 'capabilities');
});

Deno.test('agent heartbeat V2: aceita capabilities com strings não-vazias', () => {
  const result = AgentHeartbeatSchemaV2.safeParse({
    capabilities: ['onvif', 'rtsp', 'ptz'],
  });
  assertEquals(result.success, true);
});

Deno.test('agent discoveries: DiscoveryItemSchema aceita ptz_capable = null', () => {
  const result = DiscoveryItemSchema.safeParse({
    host: '192.168.1.100',
    port: 80,
    ptz_capable: null,
  });
  assertEquals(result.success, true);
});

Deno.test('agent discoveries: DiscoveryItemSchema aceita discovered_at = null', () => {
  const result = DiscoveryItemSchema.safeParse({
    host: '192.168.1.100',
    port: 80,
    discovered_at: null,
  });
  assertEquals(result.success, true);
});

Deno.test('agent discoveries: DiscoveryItemSchema aceita ptz_capable = false (não-nulo)', () => {
  const result = DiscoveryItemSchema.safeParse({
    host: '192.168.1.100',
    port: 80,
    ptz_capable: false,
  });
  assertEquals(result.success, true);
});

Deno.test(
  'agent discoveries: DiscoveryItemSchema rejeita discovered_at em formato inválido',
  async () => {
    const result = validatePayload(DiscoveryItemSchema, {
      host: '192.168.1.100',
      port: 80,
      discovered_at: 'not-a-date',
    });
    assertEquals(result.success, false);
    if (!result.success) await assert422Shape(result.response, 'discovered_at');
  }
);

Deno.test('ingest-auth V1: rejeita stream_key de exatamente 65 chars (acima do máximo)', () => {
  const result = IngestAuthSchemaV1.safeParse({
    action: 'publish',
    stream_key: 'a'.repeat(65),
  });
  assertEquals(result.success, false);
});

Deno.test('agent relay-complete V2: aceita duration_ms = 0 (mínimo válido)', () => {
  const result = AgentRelayCompleteSchemaV2.safeParse({
    task_id: 'task-abc-123',
    duration_ms: 0,
  });
  assertEquals(result.success, true);
});

Deno.test('agent relay-complete V2: rejeita duration_ms negativo', () => {
  const result = AgentRelayCompleteSchemaV2.safeParse({
    task_id: 'task-abc-123',
    duration_ms: -1,
  });
  assertEquals(result.success, false);
});

// ─────────────────────────────────────────────────────────────
// Wave 6 — Constraint ceiling/floor gap coverage
// ─────────────────────────────────────────────────────────────

// AgentHeartbeatSchemaV2: capabilities max(50) array length
Deno.test('agent heartbeat V2: rejeita capabilities com mais de 50 itens', async () => {
  const tooMany = Array.from({ length: 51 }, (_, i) => `cap-${i}`);
  const result = validatePayload(AgentHeartbeatSchemaV2, { capabilities: tooMany });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response, 'capabilities');
});

Deno.test('agent heartbeat V2: aceita capabilities com exatamente 50 itens', () => {
  const maxCaps = Array.from({ length: 50 }, (_, i) => `cap-${i}`);
  const result = AgentHeartbeatSchemaV2.safeParse({ capabilities: maxCaps });
  assertEquals(result.success, true);
});

// AgentHeartbeatSchemaV2: region max(64)
Deno.test('agent heartbeat V2: rejeita region acima de 64 chars', async () => {
  const result = validatePayload(AgentHeartbeatSchemaV2, {
    region: 'r'.repeat(65),
  });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response, 'region');
});

Deno.test('agent heartbeat V2: aceita region com exatamente 64 chars', () => {
  const result = AgentHeartbeatSchemaV2.safeParse({ region: 'r'.repeat(64) });
  assertEquals(result.success, true);
});

// IngestAuthSchemaV2: metadata value max(256)
Deno.test('ingest-auth V2: rejeita metadata com valor acima de 256 chars', async () => {
  const result = validatePayload(IngestAuthSchemaV2, {
    action: 'publish',
    stream_key: VALID_STREAM_KEY,
    metadata: { key: 'v'.repeat(257) },
  });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response);
});

Deno.test('ingest-auth V2: aceita metadata com valor de exatamente 256 chars', () => {
  const result = IngestAuthSchemaV2.safeParse({
    action: 'publish',
    stream_key: VALID_STREAM_KEY,
    metadata: { key: 'v'.repeat(256) },
  });
  assertEquals(result.success, true);
});

// AgentDiscoveriesSchemaV2: scan_duration_ms guards (negative, NaN, Infinity)
Deno.test('agent discoveries V2: rejeita scan_duration_ms negativo', async () => {
  const result = validatePayload(AgentDiscoveriesSchemaV2, {
    discoveries: [{ host: 'cam.local', port: 554 }],
    scan_duration_ms: -1,
  });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response, 'scan_duration_ms');
});

Deno.test('agent discoveries V2: rejeita scan_duration_ms = NaN', async () => {
  const result = validatePayload(AgentDiscoveriesSchemaV2, {
    discoveries: [{ host: 'cam.local', port: 554 }],
    scan_duration_ms: NaN,
  });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response, 'scan_duration_ms');
});

Deno.test('agent discoveries V2: rejeita scan_duration_ms = Infinity', async () => {
  const result = validatePayload(AgentDiscoveriesSchemaV2, {
    discoveries: [{ host: 'cam.local', port: 554 }],
    scan_duration_ms: Infinity,
  });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response, 'scan_duration_ms');
});

Deno.test('agent discoveries V2: rejeita scan_duration_ms decimal', async () => {
  const result = validatePayload(AgentDiscoveriesSchemaV2, {
    discoveries: [{ host: 'cam.local', port: 554 }],
    scan_duration_ms: 1.5,
  });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response, 'scan_duration_ms');
});

Deno.test('agent discoveries V2: aceita scan_duration_ms = 0 (mínimo válido)', () => {
  const result = AgentDiscoveriesSchemaV2.safeParse({
    discoveries: [{ host: 'cam.local', port: 554 }],
    scan_duration_ms: 0,
  });
  assertEquals(result.success, true);
});

// DiscoveryItemSchema: string field upper bounds
Deno.test('agent discoveries: DiscoveryItemSchema rejeita host acima de 253 chars', async () => {
  const result = validatePayload(DiscoveryItemSchema, {
    host: 'h'.repeat(254),
    port: 554,
  });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response, 'host');
});

Deno.test('agent discoveries: DiscoveryItemSchema aceita host de exatamente 253 chars', () => {
  const result = DiscoveryItemSchema.safeParse({ host: 'h'.repeat(253), port: 554 });
  assertEquals(result.success, true);
});

Deno.test(
  'agent discoveries: DiscoveryItemSchema rejeita manufacturer acima de 100 chars',
  async () => {
    const result = validatePayload(DiscoveryItemSchema, {
      host: 'cam.local',
      port: 554,
      manufacturer: 'm'.repeat(101),
    });
    assertEquals(result.success, false);
    if (!result.success) await assert422Shape(result.response, 'manufacturer');
  }
);

Deno.test('agent discoveries: DiscoveryItemSchema rejeita model acima de 100 chars', async () => {
  const result = validatePayload(DiscoveryItemSchema, {
    host: 'cam.local',
    port: 554,
    model: 'm'.repeat(101),
  });
  assertEquals(result.success, false);
  if (!result.success) await assert422Shape(result.response, 'model');
});

Deno.test(
  'agent discoveries: DiscoveryItemSchema rejeita firmware acima de 100 chars',
  async () => {
    const result = validatePayload(DiscoveryItemSchema, {
      host: 'cam.local',
      port: 554,
      firmware: 'f'.repeat(101),
    });
    assertEquals(result.success, false);
    if (!result.success) await assert422Shape(result.response, 'firmware');
  }
);

Deno.test(
  'agent discoveries: DiscoveryItemSchema rejeita rtsp_primary acima de 512 chars',
  async () => {
    const result = validatePayload(DiscoveryItemSchema, {
      host: 'cam.local',
      port: 554,
      rtsp_primary: 'r'.repeat(513),
    });
    assertEquals(result.success, false);
    if (!result.success) await assert422Shape(result.response, 'rtsp_primary');
  }
);

Deno.test(
  'agent discoveries: DiscoveryItemSchema rejeita rtsp_substream acima de 512 chars',
  async () => {
    const result = validatePayload(DiscoveryItemSchema, {
      host: 'cam.local',
      port: 554,
      rtsp_substream: 'r'.repeat(513),
    });
    assertEquals(result.success, false);
    if (!result.success) await assert422Shape(result.response, 'rtsp_substream');
  }
);
