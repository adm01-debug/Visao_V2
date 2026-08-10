/**
 * Onda 63 — Endpoint público para receber CSP Violation Reports.
 *
 * Aceita ambos os formatos:
 *   - Legacy: `application/csp-report` (Chrome/Safari)
 *   - Reporting API: `application/reports+json` (array de reports)
 *
 * Persiste em `public.csp_violation_reports` com hash SHA-256 do IP
 * (LGPD: não guardamos IP em claro) e limita payload a 10 KB.
 * Não requer autenticação — CSP violations podem vir de qualquer sessão.
 */
import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const MAX_BYTES = 10_240;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

async function sha256(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function normalize(raw: unknown): Record<string, unknown>[] {
  // Legacy: { "csp-report": {...} }
  if (raw && typeof raw === 'object' && 'csp-report' in (raw as Record<string, unknown>)) {
    return [(raw as { 'csp-report': Record<string, unknown> })['csp-report']];
  }
  // Reporting API: array de { type: 'csp-violation', body: {...} }
  if (Array.isArray(raw)) {
    return raw
      .filter(
        (r): r is { body: Record<string, unknown> } =>
          !!r && typeof r === 'object' && r.type === 'csp-violation' && !!r.body
      )
      .map((r) => r.body);
  }
  if (raw && typeof raw === 'object') return [raw as Record<string, unknown>];
  return [];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), {
      status: 405,
      headers: { ...cors, 'content-type': 'application/json' },
    });
  }

  const cl = Number(req.headers.get('content-length') ?? '0');
  if (cl > MAX_BYTES) {
    return new Response(JSON.stringify({ error: 'payload_too_large' }), {
      status: 413,
      headers: { ...cors, 'content-type': 'application/json' },
    });
  }

  let raw: unknown;
  try {
    const text = await req.text();
    // Byte-accurate check: text.length counts UTF-16 code units, not bytes.
    if (new TextEncoder().encode(text).length > MAX_BYTES) {
      return new Response(JSON.stringify({ error: 'payload_too_large' }), {
        status: 413,
        headers: { ...cors, 'content-type': 'application/json' },
      });
    }
    raw = JSON.parse(text);
  } catch {
    return new Response(JSON.stringify({ error: 'invalid_json' }), {
      status: 400,
      headers: { ...cors, 'content-type': 'application/json' },
    });
  }

  const reports = normalize(raw);
  if (reports.length === 0) {
    return new Response(JSON.stringify({ error: 'no_reports' }), {
      status: 400,
      headers: { ...cors, 'content-type': 'application/json' },
    });
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '';
  const ipHash = ip ? await sha256(ip + ':visao-csp') : null;
  const ua = (req.headers.get('user-agent') ?? '').slice(0, 512);

  const rows = reports.slice(0, 20).map((r) => ({
    document_uri: (r['document-uri'] ?? r['documentURL'] ?? null) as string | null,
    referrer: (r['referrer'] ?? null) as string | null,
    violated_directive: (r['violated-directive'] ?? r['effectiveDirective'] ?? null) as
      string | null,
    effective_directive: (r['effective-directive'] ?? r['effectiveDirective'] ?? null) as
      string | null,
    original_policy: (r['original-policy'] ?? r['originalPolicy'] ?? null) as string | null,
    blocked_uri: (r['blocked-uri'] ?? r['blockedURL'] ?? null) as string | null,
    source_file: (r['source-file'] ?? r['sourceFile'] ?? null) as string | null,
    line_number: Number(r['line-number'] ?? r['lineNumber']) || null,
    column_number: Number(r['column-number'] ?? r['columnNumber']) || null,
    disposition: (r['disposition'] ?? null) as string | null,
    status_code: Number(r['status-code'] ?? r['statusCode']) || null,
    user_agent: ua,
    ip_hash: ipHash,
    raw_report: r,
  }));

  const client = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
  const { error } = await client.from('csp_violation_reports').insert(rows);
  if (error) {
    console.error(
      JSON.stringify({ level: 'error', msg: 'csp_insert_failed', detail: error.message })
    );
    return new Response(JSON.stringify({ error: 'insert_failed' }), {
      status: 500,
      headers: { ...cors, 'content-type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ accepted: rows.length }), {
    status: 202,
    headers: { ...cors, 'content-type': 'application/json' },
  });
});
