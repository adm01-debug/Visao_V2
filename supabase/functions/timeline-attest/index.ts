// Onda 201 — timeline-attest: o servidor emite e registra o atestado de trajetória.
//
// Verbos:
//   { action: "issue",  timeline, subject, window, related_export_root_hash? }
//   { action: "verify", attestation }
//
// Ordem das checagens (nunca inverter):
//   1. JWT válido                                                → 401
//   2. capability recordings.export (servidor)                   → 403
//   3. corpo bem formado (trajetória com stays/transits/excluded) → 400
//   4. montagem do atestado pela régua única espelhada de _shared
//   5. INSERT sob RLS do chamador; o gatilho da Onda 201 recalcula o veredito
//      em SQL e recusa documento com veredito forjado.
//
// Três invariantes deste endpoint:
//   I1. Autoria, relógio e identificador da emissão vêm DAQUI. Um atestado cuja
//       procedência o próprio cliente escreve não prova procedência nenhuma.
//   I2. O servidor não recalcula a trajetória — ele atesta a que recebeu. O
//       documento diz isso na sua própria cláusula de divulgação.
//   I3. `verify` responde duas perguntas independentes: o documento confere
//       consigo mesmo (offline) e o selo consta no sistema de origem
//       (registro). "Não consta" nunca é apresentado como "adulterado".
import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  buildTimelineAttestation,
  verifyTimelineAttestation,
  type PersonTimeline,
  type TimelineAttestation,
} from '../_shared/timelineAttestation.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const j = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const SOURCE_SYSTEM = 'visao/201';
const HEX64 = /^[0-9a-f]{64}$/;

function isTimeline(value: unknown): value is PersonTimeline {
  const t = value as PersonTimeline | null;
  return (
    !!t &&
    typeof t === 'object' &&
    Array.isArray(t.stays) &&
    Array.isArray(t.transits) &&
    !!t.excluded &&
    typeof t.excluded === 'object' &&
    typeof t.camerasVisited === 'number'
  );
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return j({ error: 'method_not_allowed' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const userClient = createClient(supabaseUrl, anon, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(supabaseUrl, service);

    const {
      data: { user },
    } = await userClient.auth.getUser();
    if (!user) return j({ error: 'unauthenticated' }, 401);

    const { data: caps } = await admin.rpc('effective_capabilities', { p_user_id: user.id });
    const capList: string[] = Array.isArray(caps) ? (caps as string[]) : [];
    if (!capList.includes('recordings.export')) {
      return j({ error: 'missing_capability', capability: 'recordings.export' }, 403);
    }

    let body: Record<string, unknown>;
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      return j({ error: 'malformed_body' }, 400);
    }
    const action = typeof body.action === 'string' ? body.action : 'issue';

    /* ---------------- verify ---------------- */
    if (action === 'verify') {
      const attestation = body.attestation as TimelineAttestation | undefined;
      if (!attestation || typeof attestation !== 'object' || !Array.isArray(attestation.stays)) {
        return j({ error: 'invalid_attestation' }, 400);
      }
      const verification = await verifyTimelineAttestation(attestation);

      // Consulta ao registro é um eixo separado da conferência criptográfica.
      // Onda 202: três estados, não dois. Uma falha de leitura NÃO pode ser
      // reportada como "não registrado" — o conferente terceiro trataria
      // ausência de resposta como ausência de origem.
      let registryStatus: 'found' | 'absent' | 'unavailable' = 'absent';
      let registeredAt: string | null = null;
      let registeredBy: string | null = null;
      if (typeof attestation.rootHash === 'string' && HEX64.test(attestation.rootHash)) {
        const { data: row, error: lookupError } = await userClient
          .from('timeline_attestations')
          .select('issued_at, issued_by')
          .eq('root_hash', attestation.rootHash)
          .maybeSingle();
        if (lookupError) {
          registryStatus = 'unavailable';
        } else if (row) {
          registryStatus = 'found';
          registeredAt = row.issued_at ?? null;
          registeredBy = row.issued_by ?? null;
        }
      } else {
        // Selo malformado não é consulta falha: não há o que procurar.
        registryStatus = 'absent';
      }

      return j({
        intact: verification.intact,
        first_broken_index: verification.firstBrokenIndex,
        root_matches: verification.rootMatches,
        verdict_matches: verification.verdictMatches,
        recomputed_verdict: verification.recomputedVerdict,
        registry_status: registryStatus,
        registered: registryStatus === 'found',
        registered_at: registeredAt,
        registered_by: registeredBy,
      });
    }

    /* ---------------- issue ---------------- */
    if (action !== 'issue') return j({ error: 'unknown_action', action }, 400);

    const timeline = body.timeline;
    if (!isTimeline(timeline)) return j({ error: 'invalid_timeline' }, 400);

    const subjectRaw = (body.subject ?? {}) as { personId?: unknown; label?: unknown };
    const subject = {
      personId:
        typeof subjectRaw.personId === 'string' && subjectRaw.personId !== ''
          ? subjectRaw.personId
          : null,
      label:
        typeof subjectRaw.label === 'string' && subjectRaw.label !== '' ? subjectRaw.label : null,
    };

    const win = (body.window ?? {}) as { fromUtc?: unknown; toUtc?: unknown };
    const from = typeof win.fromUtc === 'string' ? Date.parse(win.fromUtc) : NaN;
    const to = typeof win.toUtc === 'string' ? Date.parse(win.toUtc) : NaN;
    if (!Number.isFinite(from) || !Number.isFinite(to)) {
      return j({ error: 'invalid_window' }, 400);
    }
    if (to < from) return j({ error: 'inverted_window' }, 422);

    const related = body.related_export_root_hash;
    if (related !== undefined && related !== null) {
      if (typeof related !== 'string' || !HEX64.test(related)) {
        return j({ error: 'invalid_related_root_hash' }, 422);
      }
    }

    const attestation = await buildTimelineAttestation({
      attestationId: crypto.randomUUID(),
      subject,
      window: {
        fromUtc: new Date(from).toISOString(),
        toUtc: new Date(to).toISOString(),
      },
      timeline,
      issuance: {
        issuedAtUtc: new Date().toISOString(),
        issuedBy: user.email ?? user.id,
        sourceSystem: SOURCE_SYSTEM,
      },
      relatedExportRootHash: (related as string | null | undefined) ?? null,
    });

    // As colunas de resumo são derivadas pelo gatilho a partir do documento;
    // mandamos o mínimo obrigatório e deixamos o banco ser a fonte da verdade.
    const { error } = await userClient.from('timeline_attestations').insert({
      attestation_id: attestation.attestationId,
      user_id: user.id,
      window_from: attestation.window.fromUtc,
      window_to: attestation.window.toUtc,
      verdict: attestation.verdict,
      root_hash: attestation.rootHash,
      document: attestation as unknown as Record<string, unknown>,
      issued_by: attestation.issuance.issuedBy,
    });

    if (error) {
      return j({ error: 'registry_rejected', detail: error.message }, 409);
    }

    return j({ attestation }, 201);
  } catch (err) {
    return j(
      { error: 'internal_error', detail: err instanceof Error ? err.message : 'unknown' },
      500
    );
  }
});
