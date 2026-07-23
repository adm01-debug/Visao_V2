/**
 * Helpers para lidar com erros retornados por Edge Functions do Supabase.
 *
 * `supabase.functions.invoke` transforma respostas HTTP não-2xx em
 * `FunctionsHttpError` genérico ("Edge function returned 400") e descarta o
 * corpo estruturado (que pode conter `error_code`, `hint`, `steps`, etc.).
 * Este módulo reabre o Response embutido no erro para expor esse payload.
 */

export interface EdgeFunctionErrorPayload {
  error?: string;
  error_code?: string;
  message?: string;
  hint?: string;
  title?: string;
  steps?: string[];
  run_from?: string;
  [key: string]: unknown;
}

/**
 * Lê o corpo JSON de um erro do supabase.functions.invoke, se disponível.
 * Retorna null se o erro não carrega um Response inspecionável ou não é JSON.
 */
export async function readFunctionErrorBody(
  err: unknown,
): Promise<EdgeFunctionErrorPayload | null> {
  const ctx = (err as {
    context?: { json?: () => Promise<unknown>; clone?: () => Response };
  })?.context;
  if (!ctx) return null;
  try {
    if (typeof ctx.json === "function") {
      const parsed = await ctx.json();
      return parsed && typeof parsed === "object"
        ? (parsed as EdgeFunctionErrorPayload)
        : null;
    }
    if (typeof ctx.clone === "function") {
      const parsed = await ctx.clone().json();
      return parsed && typeof parsed === "object"
        ? (parsed as EdgeFunctionErrorPayload)
        : null;
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Extrai a melhor mensagem legível para o usuário a partir de um erro do
 * invoke — priorizando `hint` estruturado, depois `title`, `message`, `error`.
 * Fallback para o `err.message` original.
 */
export async function humanizeFunctionError(
  err: unknown,
  fallback = "Erro na Edge Function",
): Promise<{ message: string; payload: EdgeFunctionErrorPayload | null }> {
  const payload = await readFunctionErrorBody(err);
  if (payload) {
    const message =
      (typeof payload.hint === "string" && payload.hint) ||
      (typeof payload.title === "string" && payload.title) ||
      (typeof payload.message === "string" && payload.message) ||
      (typeof payload.error === "string" && payload.error) ||
      fallback;
    return { message, payload };
  }
  const raw = (err as { message?: string })?.message;
  return { message: typeof raw === "string" && raw ? raw : fallback, payload: null };
}
