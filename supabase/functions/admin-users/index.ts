import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.89.0';
import { getCorsHeaders } from '../_shared/cors.ts';
import { adminUsersUpdateRoleSchema, validateInput } from '../_shared/validation.ts';
import { checkRateLimit, RATE_LIMITS } from '../_shared/rateLimiter.ts';
import { createLogger } from '../_shared/logger.ts';

const log = createLogger('admin-users');

interface UserProfile {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface UserRole {
  user_id: string;
  role: string;
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const rl = checkRateLimit(req, RATE_LIMITS.sensitive, 'admin-users', corsHeaders);
  if (!rl.allowed) return rl.response;

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user: caller },
    } = await callerClient.auth.getUser();

    if (!caller) {
      log.warn('Unauthorized access attempt');
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: isAdmin } = await adminClient.rpc('has_role', {
      _user_id: caller.id,
      _role: 'admin',
    });

    if (!isAdmin) {
      log.warn('Non-admin access attempt', { userId: caller.id });
      return new Response(JSON.stringify({ error: 'Acesso negado. Apenas administradores.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    // LIST USERS
    if (req.method === 'GET' || action === 'list') {
      log.info('Listing users', { adminId: caller.id });

      const {
        data: { users },
        error: usersError,
      } = await adminClient.auth.admin.listUsers({ perPage: 100 });
      if (usersError) throw usersError;

      const { data: roles } = await adminClient.from('user_roles').select('user_id, role');
      const roleMap = new Map(((roles as UserRole[]) || []).map((r) => [r.user_id, r.role]));

      const { data: profiles } = await adminClient
        .from('profiles')
        .select('user_id, full_name, avatar_url');
      const profileMap = new Map(((profiles as UserProfile[]) || []).map((p) => [p.user_id, p]));

      const userList = (users || []).map((u) => ({
        id: u.id,
        email: u.email,
        role: roleMap.get(u.id) || 'viewer',
        full_name: profileMap.get(u.id)?.full_name || u.user_metadata?.full_name || null,
        avatar_url: profileMap.get(u.id)?.avatar_url || null,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        email_confirmed_at: u.email_confirmed_at,
      }));

      log.info('Users listed', { count: userList.length });

      return new Response(JSON.stringify({ users: userList }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // UPDATE ROLE
    if (req.method === 'POST') {
      const rawBody = await req.json();
      const validation = validateInput(adminUsersUpdateRoleSchema, rawBody, corsHeaders);
      if (!validation.success) return validation.response;
      const { user_id, new_role } = validation.data;

      if (user_id === caller.id) {
        log.warn('Self-role change attempt blocked', { userId: caller.id });
        return new Response(JSON.stringify({ error: 'Não é possível alterar sua própria role' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      log.info('Updating user role', {
        targetUser: user_id,
        newRole: new_role,
        adminId: caller.id,
      });

      // Substituição atômica dentro de uma transação PL/pgSQL — evita janela
      // sem papel e valida `admin` novamente do lado do banco (defesa em profundidade).
      const { error: rpcError } = await adminClient.rpc('replace_user_role', {
        _target_user_id: user_id,
        _new_role: new_role,
        _admin_id: caller.id,
      });
      if (rpcError) throw rpcError;

      log.info('Role updated successfully', { targetUser: user_id, newRole: new_role });

      return new Response(JSON.stringify({ success: true, user_id, role: new_role }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Método não suportado' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    log.error('Unhandled error', { error: error instanceof Error ? error.message : 'Unknown' });
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
