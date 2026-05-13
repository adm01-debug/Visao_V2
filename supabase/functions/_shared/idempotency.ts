import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

/**
 * VISÃO - Idempotency Helper
 * 
 * Permite que Edge Functions evitem o processamento duplicado de requisições.
 * Útil para disparos de alertas, webhooks e integrações externas.
 */
export async function withIdempotency(
  key: string | null,
  process: () => Promise<any>
): Promise<{ data: any; fromCache: boolean }> {
  // Se nenhuma chave for fornecida, processa normalmente sem cache
  if (!key) {
    const data = await process();
    return { data, fromCache: false };
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // 1. Tentar recuperar resposta em cache
  const { data: existing } = await supabase
    .from('idempotency_keys')
    .select('response')
    .eq('key', key)
    .maybeSingle();

  if (existing) {
    return { data: existing.response, fromCache: true };
  }

  // 2. Processar a operação
  const result = await process();

  // 3. Salvar o resultado para futuras requisições com a mesma chave
  // Ignora erros de salvamento para não travar a execução original
  await supabase.from('idempotency_keys').upsert({
    key,
    response: result,
    created_at: new Date().toISOString()
  }).select();

  return { data: result, fromCache: false };
}
