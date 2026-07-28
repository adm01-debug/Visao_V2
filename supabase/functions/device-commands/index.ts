// Onda 194 — device-commands: a porta por onde o equipamento busca ordem e
// devolve laudo.
//
// Mesma postura de blindagem da Onda 191 (`device-connect`), porque o público
// é o mesmo: gravadores atrás de NAT, sem sessão de usuário, discáveis por
// qualquer um que descubra a URL. Herdamos daquela onda:
//
//   1. Autenticação pela regra única de registro (`_shared/deviceEnrollment.ts`).
//   2. Recusa canônica: qualquer falha de identidade responde 401 idêntico.
//   3. O segredo vira digest na entrada e nunca é logado, ecoado ou gravado.
//   4. O relógio é do servidor; o corpo do pedido não governa prazo nem estado.
//   5. Toda tentativa de identidade vira linha na trilha imutável.
//
// E acrescentamos o que é próprio desta onda (ver `_shared/remoteCommandDelivery.ts`):
//
//   6. Um poll entrega no máximo uma ordem, e nunca uma ordem vencida.
//   7. Ordem entregue fica sob empréstimo de 60s antes de voltar a ser oferecida.
//   8. Reentrega tem teto; esgotado o teto, a ordem é dada como perdida.
//   9. Laudo só é aceito sobre ordem entregue e dentro do prazo. Laudo tardio
//      é registrado, mas não ressuscita nada.
//
// Um detalhe deliberado: o equipamento **já autenticado** recebe motivos
// legíveis no laudo (`already_settled`, `never_delivered`...). Isso não é
// vazamento — ele provou identidade e os dados são dele. O silêncio canônico
// vale só para quem ainda não provou quem é.
import { createClient } from "npm:@supabase/supabase-js@2";
import { authenticateDevice, type DeviceRegistration } from "../_shared/deviceEnrollment.ts";
import { deniedResponse, malformedResponse, toAuditEntry } from "../_shared/deviceConnect.ts";
import { DEVICE_CODE_LENGTH } from "../_shared/deviceEnrollment.ts";
import {
  type CommandSnapshot,
  judgeReport,
  MAX_DELIVERY_ATTEMPTS,
  planPoll,
  type ReportedOutcome,
  toDeliveryEnvelope,
} from "../_shared/remoteCommandDelivery.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

const denied = () => {
  const r = deniedResponse();
  return json(r.status, r.body);
};

async function digest(secret: string): Promise<string> {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  return Array.from(new Uint8Array(bytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

const toMs = (value: string | null): number | null => (value === null ? null : Date.parse(value));

type Action = { kind: "poll" } | { kind: "report"; commandId: string; outcome: ReportedOutcome; result: Record<string, unknown>; errorMessage: string | null };

interface ParsedRequest {
  deviceCode: string;
  secret: string;
  action: Action;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Lê o pedido. Qualquer forma inaceitável vira `null` e desce pelo cano da
 * recusa canônica — a borda não explica ao desconhecido o que ele errou.
 */
function parseRequest(raw: unknown): ParsedRequest | null {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) return null;
  const body = raw as Record<string, unknown>;
  const deviceCode = body.deviceCode;
  const secret = body.secret;
  if (typeof deviceCode !== "string" || typeof secret !== "string") return null;
  if (!new RegExp(`^[A-Z0-9]{${DEVICE_CODE_LENGTH}}$`).test(deviceCode)) return null;
  if (secret.length < 16 || secret.length > 256) return null;

  const action = body.action;
  if (action === "poll" || action === undefined) {
    return { deviceCode, secret, action: { kind: "poll" } };
  }
  if (action !== "report") return null;

  const commandId = body.commandId;
  const outcome = body.outcome;
  if (typeof commandId !== "string" || !UUID_RE.test(commandId)) return null;
  if (outcome !== "completed" && outcome !== "failed") return null;

  const result = body.result;
  const errorMessage = body.errorMessage;
  return {
    deviceCode,
    secret,
    action: {
      kind: "report",
      commandId,
      outcome,
      // Carga do equipamento entra como dado opaco e limitado; nunca é
      // interpretada aqui nem devolvida a ninguém por esta função.
      result: result !== null && typeof result === "object" && !Array.isArray(result)
        ? (result as Record<string, unknown>)
        : {},
      errorMessage: typeof errorMessage === "string" ? errorMessage.slice(0, 500) : null,
    },
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return denied();

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const sourceIp = req.headers.get("x-forwarded-for");

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    const m = malformedResponse();
    return json(m.status, m.body);
  }

  const parsed = parseRequest(raw);
  if (parsed === null) return denied();

  try {
    const presentedHash = await digest(parsed.secret);
    const now = Date.now();

    const { data: row } = await admin
      .from("device_registrations")
      .select(
        "id, user_id, device_code, status, secret_hash, secret_version, secret_issued_at, previous_secret_hash, rotated_at, expires_at, last_seen_at",
      )
      .eq("device_code", parsed.deviceCode)
      .maybeSingle();

    const registration: DeviceRegistration | null = row
      ? {
        deviceCode: row.device_code,
        status: row.status,
        secretHash: row.secret_hash,
        secretVersion: row.secret_version,
        secretIssuedAt: Date.parse(row.secret_issued_at),
        previousSecretHash: row.previous_secret_hash,
        rotatedAt: toMs(row.rotated_at),
        expiresAt: toMs(row.expires_at),
        lastSeenAt: toMs(row.last_seen_at),
      }
      : null;

    const verdict = authenticateDevice(registration, {
      deviceCode: parsed.deviceCode,
      presentedHash,
      now,
    });

    await admin.from("device_registration_audit").insert(
      toAuditEntry(verdict, {
        registrationId: row?.id ?? null,
        userId: row?.user_id ?? null,
        deviceCode: parsed.deviceCode,
        sourceIp,
      }),
    );

    if (verdict.outcome !== "accepted" || !row) return denied();

    const nowIso = new Date(now).toISOString();
    // Buscar trabalho é prova de vida — vale para o vigia de silêncio (Onda 192).
    await admin
      .from("device_registrations")
      .update({ last_seen_at: nowIso })
      .eq("id", row.id);

    if (parsed.action.kind === "report") {
      return await handleReport(admin, row.id, parsed.action, now, nowIso);
    }
    return await handlePoll(admin, row.id, now, nowIso);
  } catch (_error) {
    console.error("device-commands: falha interna ao atender equipamento");
    return denied();
  }
});

type Admin = ReturnType<typeof createClient>;

const OPEN_STATUSES = ["queued", "awaiting_presence", "delivered"];

function toSnapshot(r: Record<string, unknown>): CommandSnapshot {
  return {
    id: r.id as string,
    command: r.command as CommandSnapshot["command"],
    status: r.status as CommandSnapshot["status"],
    createdAt: Date.parse(r.created_at as string),
    expiresAt: Date.parse(r.expires_at as string),
    deliveredAt: r.delivered_at ? Date.parse(r.delivered_at as string) : null,
    deliveryAttempts: (r.delivery_attempts as number) ?? 0,
  };
}

async function handlePoll(admin: Admin, registrationId: string, now: number, nowIso: string) {
  const { data: rows } = await admin
    .from("device_remote_commands")
    .select("id, command, status, payload, created_at, expires_at, delivered_at, delivery_attempts")
    .eq("registration_id", registrationId)
    .in("status", OPEN_STATUSES)
    .order("created_at", { ascending: true })
    .limit(50);

  const snapshots = (rows ?? []).map(toSnapshot);
  const plan = planPoll(snapshots, now);

  // Encerramentos primeiro: uma ordem vencida não pode sobreviver a esta
  // rodada nem por um instante, mesmo que a entrega abaixo falhe.
  for (const d of plan.decisions) {
    if (d.action === "expire") {
      await admin
        .from("device_remote_commands")
        .update({ status: "expired", error_message: "prazo vencido antes da entrega" })
        .eq("id", d.commandId)
        .in("status", OPEN_STATUSES);
    } else if (d.action === "exhaust") {
      await admin
        .from("device_remote_commands")
        .update({
          status: "failed",
          reported_at: nowIso,
          error_message: `entregue ${MAX_DELIVERY_ATTEMPTS}x sem laudo do equipamento`,
        })
        .eq("id", d.commandId)
        .eq("status", "delivered");
    }
  }

  if (!plan.delivery) return json(200, { command: null });

  const snapshot = snapshots.find((s) => s.id === plan.delivery!.commandId)!;
  const source = (rows ?? []).find((r) => (r.id as string) === snapshot.id)!;

  // A escrita é condicional ao estado lido: se outro poll concorrente já pegou
  // a ordem, esta atualização não encontra linha e nada é entregue duas vezes.
  const { data: claimed } = await admin
    .from("device_remote_commands")
    .update({
      status: "delivered",
      delivered_at: nowIso,
      delivery_attempts: snapshot.deliveryAttempts + 1,
    })
    .eq("id", snapshot.id)
    .eq("delivery_attempts", snapshot.deliveryAttempts)
    .in("status", OPEN_STATUSES)
    .select("id")
    .maybeSingle();

  if (!claimed) return json(200, { command: null });

  const payload = (source.payload ?? {}) as Record<string, unknown>;
  return json(200, { command: toDeliveryEnvelope(snapshot, payload, plan.delivery) });
}

async function handleReport(
  admin: Admin,
  registrationId: string,
  action: Extract<Action, { kind: "report" }>,
  now: number,
  nowIso: string,
) {
  const { data: row } = await admin
    .from("device_remote_commands")
    .select("id, command, status, created_at, expires_at, delivered_at, delivery_attempts")
    .eq("id", action.commandId)
    // Posse resolvida na consulta: ordem de outro equipamento simplesmente
    // não é encontrada, e o julgamento não consegue distinguir isso de
    // "identificador inexistente".
    .eq("registration_id", registrationId)
    .maybeSingle();

  const snapshot = row ? toSnapshot(row) : null;
  const judgement = judgeReport(snapshot, { outcome: action.outcome, now });

  if (!judgement.accepted) {
    // Vencida durante a execução: o encerramento é por prazo, não por laudo.
    if (judgement.reason === "deadline_passed" && snapshot) {
      await admin
        .from("device_remote_commands")
        .update({
          status: "expired",
          error_message: "laudo chegou após o prazo; ordem encerrada por vencimento",
        })
        .eq("id", snapshot.id)
        .eq("status", "delivered");
    }
    return json(200, { accepted: false, reason: judgement.reason });
  }

  const { data: settled } = await admin
    .from("device_remote_commands")
    .update({
      status: judgement.nextStatus,
      reported_at: nowIso,
      result: action.result,
      error_message: action.outcome === "failed" ? action.errorMessage : null,
    })
    .eq("id", action.commandId)
    .eq("status", "delivered")
    .select("id")
    .maybeSingle();

  if (!settled) return json(200, { accepted: false, reason: "already_settled" });
  return json(200, { accepted: true, status: judgement.nextStatus });
}
