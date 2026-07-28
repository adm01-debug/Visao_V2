// Onda 191 — device-connect: a porta pública da Conexão por Registro.
//
// Quem bate nesta porta é um gravador/agente atrás de NAT. Ele não tem sessão
// de usuário, então esta é a única função sem JWT de pessoa — e, por isso, a
// mais exposta do sistema. A postura aqui é de porta blindada:
//
//   1. Toda recusa devolve exatamente a mesma resposta (401 `{connected:false}`).
//      Código inexistente, revogado, vencido ou segredo errado: idênticos.
//   2. O segredo é convertido em digest imediatamente e nunca é logado,
//      ecoado ou gravado — nem em caminho de erro.
//   3. O relógio é do servidor. O corpo do pedido não governa prazo nem versão.
//   4. Toda tentativa vira linha na trilha imutável, inclusive as de dispositivo
//      desconhecido — é assim que uma varredura fica visível ao operador.
//   5. O julgamento é da regra única da Onda 190 (`_shared/deviceEnrollment.ts`,
//      espelho byte a byte de `src/lib/devices/deviceEnrollment.ts`). Esta
//      função só faz E/S: ler, derivar digest, buscar, julgar, registrar.
import { createClient } from "npm:@supabase/supabase-js@2";
import { authenticateDevice, type DeviceRegistration } from "../_shared/deviceEnrollment.ts";
import {
  deniedResponse,
  malformedResponse,
  parseConnectRequest,
  toAuditEntry,
  toPublicResponse,
  type PublicResponse,
} from "../_shared/deviceConnect.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const send = (res: PublicResponse) =>
  new Response(JSON.stringify(res.body), {
    status: res.status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

/** SHA-256 hex do segredo apresentado. O texto morre nesta função. */
async function digest(secret: string): Promise<string> {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  return Array.from(new Uint8Array(bytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

const toMs = (value: string | null): number | null =>
  value === null ? null : Date.parse(value);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return send(deniedResponse());

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const sourceIp = req.headers.get("x-forwarded-for");

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    // Pedido ilegível não nomeia nenhum dispositivo: não há o que vazar.
    return send(malformedResponse());
  }

  const parsed = parseConnectRequest(raw);
  if (!parsed.ok) {
    return send(parsed.kind === "not_json" ? malformedResponse() : deniedResponse());
  }
  const { deviceCode, secret } = parsed.value;

  try {
    const presentedHash = await digest(secret);
    const now = Date.now(); // invariante 3 — relógio do servidor, sempre.

    const { data: row } = await admin
      .from("device_registrations")
      .select(
        "id, user_id, device_code, status, secret_hash, secret_version, secret_issued_at, previous_secret_hash, rotated_at, expires_at, last_seen_at",
      )
      .eq("device_code", deviceCode)
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

    const verdict = authenticateDevice(registration, { deviceCode, presentedHash, now });

    // Trilha primeiro: um aceite que não deixa rastro é pior que uma recusa.
    await admin.from("device_registration_audit").insert(
      toAuditEntry(verdict, {
        registrationId: row?.id ?? null,
        userId: row?.user_id ?? null,
        deviceCode,
        sourceIp,
      }),
    );

    // Prova de vida só em aceitação (invariante 7 da Onda 190).
    if (verdict.outcome === "accepted" && row) {
      await admin
        .from("device_registrations")
        .update({ last_seen_at: new Date(now).toISOString() })
        .eq("id", row.id);
    }

    return send(toPublicResponse(verdict));
  } catch (_error) {
    // Falha interna nunca vira dica: a porta responde como qualquer recusa.
    // O detalhe fica no log da função, sem o segredo.
    console.error("device-connect: falha interna ao julgar tentativa de conexão");
    return send(deniedResponse());
  }
});
