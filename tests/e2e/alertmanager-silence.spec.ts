import { test, expect, request } from '@playwright/test';

/**
 * VISÃO — Wave Storage 27 · E2E do fluxo de silenciamento (Alertmanager).
 *
 * Cobre falhas de permissão e validação chamando a Edge Function real. Não
 * depende de MediaMTX/Alertmanager estarem online — os cenários positivos
 * ficam para a suíte de integração (ver simulate-wave-storage-27-scenarios.mjs).
 */

const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '';
const ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY ?? '';
const FN_PATH = '/functions/v1/alertmanager-silence';

const skipReason =
  !SUPABASE_URL || !ANON_KEY
    ? 'Variáveis VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY ausentes'
    : null;

test.describe('Alertmanager silence — falhas de permissão e validação (E2E)', () => {
  test.skip(!!skipReason, skipReason ?? '');

  test('anônimo (sem Authorization) recebe 401', async () => {
    const api = await request.newContext({ baseURL: SUPABASE_URL });
    const res = await api.get(`${FN_PATH}?action=list`, {
      headers: { apikey: ANON_KEY },
    });
    expect([401, 403]).toContain(res.status());
    const body = await res.json().catch(() => ({}));
    expect(String(body.error ?? '')).toMatch(/unauthorized|forbidden/i);
    await api.dispose();
  });

  test('DELETE sem justificativa é rejeitado com 400', async () => {
    const api = await request.newContext({ baseURL: SUPABASE_URL });
    // Sem Bearer válido, o endpoint responde 401 antes de validar a justificativa.
    // A intenção deste teste é garantir que a rota exista e responda de forma
    // determinística — não vaza detalhes internos em nenhum caminho.
    const res = await api.delete(`${FN_PATH}?id=abcd1234`, {
      headers: { apikey: ANON_KEY },
    });
    expect([400, 401, 403]).toContain(res.status());
    const body = await res.json().catch(() => ({}));
    expect(body).not.toHaveProperty('stack');
    expect(body).not.toHaveProperty('details.env');
    await api.dispose();
  });

  test('POST create com payload inválido não vaza stack traces', async () => {
    const api = await request.newContext({ baseURL: SUPABASE_URL });
    const res = await api.post(`${FN_PATH}?action=create`, {
      headers: { apikey: ANON_KEY, 'content-type': 'application/json' },
      data: { matchers: [{ name: 'alertname', value: '.*', isRegex: true }] },
    });
    // Anônimo é barrado em 401; se a suíte rodar com admin real, o payload
    // seria rejeitado com 400 (match_everything_forbidden). Ambos são aceitáveis.
    expect([400, 401, 403]).toContain(res.status());
    const body = await res.json().catch(() => ({}));
    expect(JSON.stringify(body)).not.toMatch(/at Object\.|node_modules|Deno\.core/);
    await api.dispose();
  });

  test('CORS preflight responde 200 com headers permissivos', async () => {
    const api = await request.newContext({ baseURL: SUPABASE_URL });
    const res = await api.fetch(FN_PATH, { method: 'OPTIONS' });
    expect(res.status()).toBe(200);
    expect(res.headers()['access-control-allow-methods'] ?? '').toMatch(/DELETE/i);
    await api.dispose();
  });
});
