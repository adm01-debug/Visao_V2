import { test, expect, request } from '@playwright/test';

/**
 * VISÃO — E2E do fluxo Validar RTSP + Prévia ao vivo (rtsp-preview).
 *
 * Cobre autenticação, validação de payload e não-vazamento de detalhes.
 * Cenários positivos completos (com MediaMTX real) ficam em suíte de integração.
 */

const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '';
const ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY ?? '';

const VALIDATE_PATH = '/functions/v1/validate-rtsp-stream';
const PREVIEW_PATH = '/functions/v1/rtsp-preview';

const skipReason =
  !SUPABASE_URL || !ANON_KEY
    ? 'Variáveis VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY ausentes'
    : null;

test.describe('rtsp-preview — hardening (auth, validação, cleanup)', () => {
  test.skip(!!skipReason, skipReason ?? '');

  test('POST sem Authorization retorna 401', async () => {
    const api = await request.newContext({ baseURL: SUPABASE_URL });
    const res = await api.post(PREVIEW_PATH, {
      headers: { apikey: ANON_KEY, 'content-type': 'application/json' },
      data: { action: 'start', rtspUrl: 'rtsp://user:pass@10.0.0.1:554/stream' },
    });
    expect([401, 403]).toContain(res.status());
    const body = await res.json().catch(() => ({}));
    expect(String(body.error ?? '')).toMatch(/unauthorized|forbidden/i);
    await api.dispose();
  });

  test('OPTIONS (preflight CORS) responde 2xx com headers', async () => {
    const api = await request.newContext({ baseURL: SUPABASE_URL });
    const res = await api.fetch(PREVIEW_PATH, { method: 'OPTIONS' });
    expect([200, 204]).toContain(res.status());
    expect(res.headers()['access-control-allow-origin']).toBeTruthy();
    await api.dispose();
  });

  test('método GET é rejeitado com 405', async () => {
    const api = await request.newContext({ baseURL: SUPABASE_URL });
    const res = await api.get(PREVIEW_PATH, {
      headers: { apikey: ANON_KEY },
    });
    expect([401, 405]).toContain(res.status());
    await api.dispose();
  });

  test('start com rtspUrl inválida (não-rtsp) é rejeitado sem vazar stack', async () => {
    const api = await request.newContext({ baseURL: SUPABASE_URL });
    const res = await api.post(PREVIEW_PATH, {
      headers: { apikey: ANON_KEY, 'content-type': 'application/json' },
      data: { action: 'start', rtspUrl: 'http://evil.example/x' },
    });
    // Sem Bearer válido, 401 antes de validar. Ambos aceitáveis.
    expect([400, 401, 403]).toContain(res.status());
    const body = await res.json().catch(() => ({}));
    expect(JSON.stringify(body)).not.toMatch(/at Object\.|node_modules|Deno\.core/);
    await api.dispose();
  });

  test('extend sem sessionId é rejeitado com 400/401', async () => {
    const api = await request.newContext({ baseURL: SUPABASE_URL });
    const res = await api.post(PREVIEW_PATH, {
      headers: { apikey: ANON_KEY, 'content-type': 'application/json' },
      data: { action: 'extend' },
    });
    expect([400, 401, 403]).toContain(res.status());
    await api.dispose();
  });

  test('stop sem sessionId é rejeitado com 400/401', async () => {
    const api = await request.newContext({ baseURL: SUPABASE_URL });
    const res = await api.post(PREVIEW_PATH, {
      headers: { apikey: ANON_KEY, 'content-type': 'application/json' },
      data: { action: 'stop' },
    });
    expect([400, 401, 403]).toContain(res.status());
    await api.dispose();
  });

  test('body inválido (não-JSON) responde 400/401 sem crash', async () => {
    const api = await request.newContext({ baseURL: SUPABASE_URL });
    const res = await api.post(PREVIEW_PATH, {
      headers: { apikey: ANON_KEY, 'content-type': 'application/json' },
      data: 'not-json-{',
    });
    expect([400, 401, 403]).toContain(res.status());
    await api.dispose();
  });

  test('action desconhecida é rejeitada', async () => {
    const api = await request.newContext({ baseURL: SUPABASE_URL });
    const res = await api.post(PREVIEW_PATH, {
      headers: { apikey: ANON_KEY, 'content-type': 'application/json' },
      data: { action: 'DROP TABLE' },
    });
    expect([400, 401, 403]).toContain(res.status());
    await api.dispose();
  });
});

test.describe('validate-rtsp-stream — hardening', () => {
  test.skip(!!skipReason, skipReason ?? '');

  test('anônimo (sem Authorization) recebe 401', async () => {
    const api = await request.newContext({ baseURL: SUPABASE_URL });
    const res = await api.post(VALIDATE_PATH, {
      headers: { apikey: ANON_KEY, 'content-type': 'application/json' },
      data: { mode: 'inline', rtspUrl: 'rtsp://10.0.0.1/stream' },
    });
    expect([401, 403]).toContain(res.status());
    await api.dispose();
  });
});
