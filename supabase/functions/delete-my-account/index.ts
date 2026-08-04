import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.89.0';
import { getCorsHeaders } from '../_shared/cors.ts';
import { createLogger } from '../_shared/logger.ts';
import { checkRateLimit } from '../_shared/rateLimiter.ts';

const log = createLogger('delete-my-account');

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Rate limit destructive endpoint aggressively (5 req / hour per IP)
  const rl = checkRateLimit(
    req,
    { maxRequests: 5, windowMs: 60 * 60 * 1000 },
    'delete-my-account',
    corsHeaders
  );
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

    // Client do usuário para validar o JWT e pegar o ID
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();
    if (userError || !user) {
      log.warn('Tentativa de exclusão com token inválido');
      return new Response(JSON.stringify({ error: 'Sessão inválida' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = user.id;
    const traceId = req.headers.get('x-request-id') || undefined;
    log.info('Iniciando processo de exclusão de conta (LGPD)', { userId, traceId });

    // Client Admin para realizar as operações destrutivas
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Chamar a função SQL que limpa os dados em cascata nas tabelas públicas
    const { error: dbError } = await adminClient.rpc('delete_user_data', {
      _target_user_id: userId,
    });

    if (dbError) {
      log.error('Erro ao deletar dados do banco', { userId, error: dbError.message });
      throw new Error(`Erro ao limpar dados: ${dbError.message}`);
    }

    // 2. Deletar o usuário da autenticação
    const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(userId);

    if (authDeleteError) {
      log.error('Erro ao deletar usuário da Auth', { userId, error: authDeleteError.message });
      throw new Error(`Erro ao remover conta de acesso: ${authDeleteError.message}`);
    }

    log.info('Conta excluída com sucesso', { userId });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Sua conta e todos os dados associados foram excluídos permanentemente.',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    log.error('Falha crítica no processo de exclusão', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Erro interno ao excluir conta',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
