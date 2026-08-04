// Onda 158 — evidence-seal: o servidor é quem sela a prova.
//
// Verbos:
//   { action: "seal",   camera_id, requested_from_utc, requested_to_utc,
//                       segments[], transformations[], pixels_altered }
//   { action: "verify", export_id }
//   { action: "dossier", export_id }   (Onda 160 — cópia portátil para terceiros)

//
// Ordem das checagens (nunca inverter):
//   1. JWT válido                                            → 401
//   2. capability recordings.export (servidor, effective_capabilities) → 403
//   3. propriedade da câmera sob RLS do chamador             → 404
//   4. admitSealRequest (regra única, espelhada de _shared)  → 400/422
//   5. buildManifest (regra da Onda 156) — o veredito é derivado, nunca pedido
//   6. INSERT sob RLS do chamador; o gatilho da Onda 157 recalcula a corrente
//      em SQL e recusa qualquer divergência de 1 byte.
//
// Não existe atalho de service role para selar: uma prova sem autor humano
// autenticado não é prova (C6). O admin também não sela por outro usuário —
// `user_id` é sempre `auth.uid()`, imposto pela política de INSERT.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { buildManifest, verifyManifest, type CustodyManifest } from '../_shared/custodyManifest.ts';
import { admitSealRequest, statusForRejection } from '../_shared/evidenceSealRequest.ts';

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

const SYSTEM_VERSION = 'visao/158';

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

    // 1. autenticação — sem exceção de sistema neste caminho.
    const {
      data: { user },
    } = await userClient.auth.getUser();
    if (!user) return j({ error: 'unauthenticated' }, 401);

    // 2. capability no servidor
    const { data: caps } = await admin.rpc('effective_capabilities', { p_user_id: user.id });
    const capList: string[] = Array.isArray(caps) ? (caps as string[]) : [];
    if (!capList.includes('recordings.export')) {
      return j({ error: 'missing_capability', capability: 'recordings.export' }, 403);
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return j({ error: 'malformed_body' }, 400);
    }
    const action = (body as { action?: string })?.action ?? 'seal';

    /* ---------------- verify ---------------- */
    if (action === 'verify') {
      const exportId = (body as { export_id?: unknown }).export_id;
      if (typeof exportId !== 'string' || exportId === '') {
        return j({ error: 'invalid_export_id' }, 400);
      }
      // Leitura sob RLS do chamador: quem não enxerga a exportação recebe 404,
      // não um "existe mas não é sua" (isso já seria vazamento de existência).
      const { data: row } = await userClient
        .from('evidence_exports')
        .select('export_id, root_hash, verdict, coverage_ratio, sealed_at, manifest')
        .eq('export_id', exportId)
        .maybeSingle();
      if (!row) return j({ error: 'export_not_found' }, 404);

      const manifest = row.manifest as unknown as CustodyManifest;
      const verification = await verifyManifest(manifest);
      const storedMatches = manifest.rootHash === row.root_hash;

      return j({
        export_id: row.export_id,
        sealed_at: row.sealed_at,
        verdict: row.verdict,
        coverage_ratio: Number(row.coverage_ratio),
        intact: verification.intact && storedMatches,
        first_broken_index: verification.firstBrokenIndex,
        root_matches: verification.rootMatches && storedMatches,
      });
    }

    /* ---------------- dossier (Onda 160) ----------------
     * Entrega o manifesto selado + os fatos da emissão. Autoria e relógio da
     * emissão vêm daqui, nunca do corpo da requisição: um dossiê cuja
     * procedência o próprio cliente escreve não prova procedência nenhuma.
     */
    if (action === 'dossier') {
      const exportId = (body as { export_id?: unknown }).export_id;
      if (typeof exportId !== 'string' || exportId === '') {
        return j({ error: 'invalid_export_id' }, 400);
      }
      const { data: row } = await userClient
        .from('evidence_exports')
        .select('export_id, root_hash, sealed_at, manifest')
        .eq('export_id', exportId)
        .maybeSingle();
      if (!row) return j({ error: 'export_not_found' }, 404);

      const manifest = row.manifest as unknown as CustodyManifest;
      // Recusa emitir cópia portátil de algo que já não confere internamente:
      // seria distribuir uma prova quebrada com aparência de documento oficial.
      const verification = await verifyManifest(manifest);
      if (!verification.intact || manifest.rootHash !== row.root_hash) {
        return j(
          {
            error: 'seal_broken',
            detail: 'A exportação guardada não confere com o próprio selo.',
            first_broken_index: verification.firstBrokenIndex,
          },
          409
        );
      }

      return j({
        export_id: row.export_id,
        sealed_at: row.sealed_at,
        manifest,
        issued_at_utc: new Date().toISOString(),
        issued_by: user.email ?? user.id,
        source_system: SYSTEM_VERSION,
      });
    }

    if (action !== 'seal') return j({ error: 'unknown_action' }, 400);

    // 3. propriedade da câmera sob RLS do chamador
    const cameraId = (body as { camera_id?: unknown }).camera_id;
    if (typeof cameraId !== 'string') return j({ error: 'invalid_camera_id' }, 400);
    const { data: camera } = await userClient
      .from('cameras')
      .select('id')
      .eq('id', cameraId)
      .maybeSingle();
    if (!camera) return j({ error: 'camera_not_found' }, 404);

    // 4. admissão — identidade, autoria e relógio vêm daqui, não do corpo.
    const admission = admitSealRequest(body, {
      requestedBy: user.id,
      exportId: crypto.randomUUID(),
      nowMs: Date.now(),
      systemVersion: SYSTEM_VERSION,
    });
    if (!admission.ok) {
      return j(
        { error: admission.code, detail: admission.detail },
        statusForRejection(admission.code)
      );
    }

    // 5. manifesto e selo
    const manifest = await buildManifest(admission.request);

    // 6. gravação imutável sob RLS do chamador. Os campos derivados são
    // recalculados pelo gatilho a partir do JSONB — enviá-los aqui é apenas
    // conveniência de tipagem; se mentissem, o banco recusaria.
    const { data: inserted, error } = await userClient
      .from('evidence_exports')
      .insert({
        user_id: user.id,
        camera_id: manifest.cameraId,
        export_id: manifest.exportId,
        root_hash: manifest.rootHash,
        verdict: manifest.assessment.level,
        coverage_ratio: Number(manifest.assessment.coverageRatio.toFixed(6)),
        segment_count: manifest.segments.length,
        gap_count: manifest.assessment.gaps.length,
        manifest: manifest as unknown as Record<string, unknown>,
      })
      .select('id, export_id, verdict, coverage_ratio, sealed_at')
      .single();

    if (error) {
      // Divergência entre a regra TS e o recálculo SQL é falha grave de
      // integridade — nunca deve ser mascarada como erro genérico.
      return j({ error: 'seal_rejected_by_database', detail: error.message }, 409);
    }

    return j(
      {
        id: inserted.id,
        export_id: inserted.export_id,
        verdict: inserted.verdict,
        coverage_ratio: Number(inserted.coverage_ratio),
        sealed_at: inserted.sealed_at,
        root_hash: manifest.rootHash,
        gap_count: manifest.assessment.gaps.length,
        reasons: manifest.assessment.reasons,
        manifest,
      },
      201
    );
  } catch (e) {
    return j({ error: 'internal_error', detail: String(e) }, 500);
  }
});
