import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { getCorsHeaders } from "../_shared/cors.ts";
import { adminUsersUpdateRoleSchema, validateInput } from "../_shared/validation.ts";

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();

    if (!caller) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: isAdmin } = await adminClient.rpc("has_role", {
      _user_id: caller.id, _role: "admin",
    });

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Acesso negado. Apenas administradores." }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    // LIST USERS
    if (req.method === "GET" || action === "list") {
      const { data: { users }, error: usersError } = await adminClient.auth.admin.listUsers({ perPage: 100 });
      if (usersError) throw usersError;

      const { data: roles } = await adminClient.from("user_roles").select("user_id, role");
      const roleMap = new Map((roles || []).map((r: any) => [r.user_id, r.role]));

      const { data: profiles } = await adminClient.from("profiles").select("user_id, full_name, avatar_url");
      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));

      const userList = (users || []).map((u: any) => ({
        id: u.id, email: u.email, role: roleMap.get(u.id) || "viewer",
        full_name: profileMap.get(u.id)?.full_name || u.user_metadata?.full_name || null,
        avatar_url: profileMap.get(u.id)?.avatar_url || null,
        created_at: u.created_at, last_sign_in_at: u.last_sign_in_at, email_confirmed_at: u.email_confirmed_at,
      }));

      return new Response(JSON.stringify({ users: userList }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // UPDATE ROLE
    if (req.method === "POST") {
      const rawBody = await req.json();
      const validation = validateInput(adminUsersUpdateRoleSchema, rawBody, corsHeaders);
      if (!validation.success) return validation.response;
      const { user_id, new_role } = validation.data;

      if (user_id === caller.id) {
        return new Response(JSON.stringify({ error: "Não é possível alterar sua própria role" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error: roleError } = await adminClient.from("user_roles").upsert(
        { user_id, role: new_role, updated_at: new Date().toISOString() },
        { onConflict: "user_id,role" }
      );

      if (roleError) {
        await adminClient.from("user_roles").delete().eq("user_id", user_id);
        const { error: insertError } = await adminClient.from("user_roles").insert({ user_id, role: new_role });
        if (insertError) throw insertError;
      }

      return new Response(JSON.stringify({ success: true, user_id, role: new_role }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Método não suportado" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
