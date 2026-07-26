// VISÃO — Onda 126: worker de despacho para centrais de monitoramento.
//
// Lê a fila `monitoring_center_dispatches` com locação (lease), transforma cada
// item em um quadro SIA DC-09 / Contact ID e entrega ao endpoint da receptora
// (Sigma, Moni, Commbox). O veredito de cada tentativa volta para o banco por
// `settle_monitoring_center_dispatch`, que aplica recuo exponencial, teto de
// tentativas e prazo final — a política vive no banco, não aqui.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { formatContactIdFrame, type ContactIdQualifier } from "../_shared/contactId.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const log = (level: "info" | "warn" | "error", msg: string, extra: Record<string, unknown> = {}) =>
  console.log(JSON.stringify({ level, fn: "monitoring-center-dispatch", msg, ...extra }));

interface DispatchRow {
  id: string;
  account_id: string;
  event_kind: string;
  contact_code: string;
  qualifier: ContactIdQualifier;
  zone_code: string;
  attempts: number;
  created_at: string;
}

interface AccountRow {
  id: string;
  provider: string;
  account_code: string;
  partition_code: string;
  receiver_number: string;
  line_prefix: string;
  endpoint_url: string;
}

/** Tempo máximo tolerado por entrega: acima disso a receptora está fora. */
const DELIVERY_TIMEOUT_MS = 8_000;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) {
    log("error", "credenciais de serviço ausentes");
    return json({ error: "service_credentials_missing" }, 500);
  }
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const worker = `edge-${crypto.randomUUID().slice(0, 8)}`;
  let batchSize = 20;
  try {
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    if (typeof body?.limit === "number") batchSize = Math.min(Math.max(body.limit, 1), 100);
  } catch {
    // corpo opcional: um POST vazio é uma execução padrão
  }

  // Devolve à fila o que ficou preso em worker morto antes de reclamar novos.
  const { data: reaped } = await supabase.rpc("reap_monitoring_center_leases");

  const { data: claimed, error: claimError } = await supabase.rpc(
    "claim_monitoring_center_dispatches",
    { _worker: worker, _limit: batchSize },
  );
  if (claimError) {
    log("error", "falha ao reclamar despachos", { error: claimError.message });
    return json({ error: "claim_failed", detail: claimError.message }, 500);
  }

  const rows = (claimed ?? []) as DispatchRow[];
  if (rows.length === 0) {
    return json({ worker, claimed: 0, delivered: 0, failed: 0, reaped: reaped ?? null });
  }

  const accountIds = [...new Set(rows.map((r) => r.account_id))];
  const { data: accountRows } = await supabase
    .from("monitoring_center_accounts")
    .select("id, provider, account_code, partition_code, receiver_number, line_prefix, endpoint_url")
    .in("id", accountIds);
  const accounts = new Map<string, AccountRow>(
    ((accountRows ?? []) as AccountRow[]).map((a) => [a.id, a]),
  );

  let delivered = 0;
  let failed = 0;

  for (const row of rows) {
    const account = accounts.get(row.account_id);
    if (!account) {
      await supabase.rpc("settle_monitoring_center_dispatch", {
        _dispatch_id: row.id,
        _ok: false,
        _error: "account_vanished",
      });
      failed += 1;
      continue;
    }

    // Sequência DC-09 derivada do relógio: monotônica dentro de cada ciclo.
    const sequence = (Math.floor(Date.now() / 1000) % 9999) + 1;
    const frame = formatContactIdFrame({
      accountCode: account.account_code,
      code: row.contact_code,
      qualifier: row.qualifier,
      partitionCode: account.partition_code,
      zoneCode: row.zone_code,
      sequence,
      receiverNumber: account.receiver_number,
      linePrefix: account.line_prefix,
      at: new Date(),
    });

    let error: string | null = null;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), DELIVERY_TIMEOUT_MS);
    try {
      const resp = await fetch(account.endpoint_url, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "X-Visao-Provider": account.provider,
          "X-Visao-Event": row.event_kind,
        },
        body: frame,
        signal: controller.signal,
      });
      const text = await resp.text().catch(() => "");
      if (!resp.ok) {
        error = `http_${resp.status}:${text.slice(0, 180)}`;
      } else if (/NAK|DUH/i.test(text)) {
        // A receptora respondeu 200 mas rejeitou o quadro: isso é falha real.
        error = `nak:${text.slice(0, 180)}`;
      }
    } catch (e) {
      error = e instanceof Error ? `${e.name}:${e.message}`.slice(0, 200) : "unknown_error";
    } finally {
      clearTimeout(timer);
    }

    const { error: settleError } = await supabase.rpc("settle_monitoring_center_dispatch", {
      _dispatch_id: row.id,
      _ok: error === null,
      _error: error,
    });
    if (settleError) {
      log("error", "falha ao concluir despacho", { id: row.id, error: settleError.message });
    }
    if (error === null) delivered += 1;
    else failed += 1;
  }

  log("info", "ciclo concluído", { worker, claimed: rows.length, delivered, failed });
  return json({ worker, claimed: rows.length, delivered, failed, reaped: reaped ?? null });
});
