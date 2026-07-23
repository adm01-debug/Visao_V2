// agent-pair — Emite token opaco para pareamento de um Agente Local ONVIF.
// Chamado do frontend com JWT do usuário; devolve o token EM CLARO uma única vez.
// O banco armazena apenas SHA-256 do token.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const j = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", data));
  return Array.from(digest).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function generateToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return j({ error: "method_not_allowed" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return j({ error: "unauthorized" }, 401);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const jwt = authHeader.replace("Bearer ", "");
  const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims(jwt);
  if (claimsErr || !claimsData?.claims?.sub) return j({ error: "unauthorized" }, 401);
  const userId = claimsData.claims.sub as string;

  let payload: { name?: string; network_cidr?: string };
  try {
    payload = await req.json();
  } catch {
    return j({ error: "invalid_json" }, 400);
  }
  const name = (payload.name ?? "").trim();
  const cidr = (payload.network_cidr ?? "").trim() || null;
  if (name.length < 1 || name.length > 80) return j({ error: "invalid_name" }, 400);

  const token = generateToken();
  const tokenHash = await sha256Hex(token);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { data, error } = await admin
    .from("local_agents")
    .insert({ user_id: userId, name, network_cidr: cidr, token_hash: tokenHash })
    .select("id, name, network_cidr, created_at")
    .single();

  if (error) return j({ error: "insert_failed", detail: error.message }, 500);

  return j({ ok: true, agent: data, token });
});
