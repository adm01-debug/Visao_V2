import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useState } from 'react';
import { errorReporter } from '@/lib/errorReporter';
import { logger } from '@/lib/logger';

function toError(err: unknown): Error {
  return err instanceof Error ? err : new Error(typeof err === 'string' ? err : JSON.stringify(err));
}

function isClientError(err: unknown): boolean {
  const status =
    (err as { status?: number } | null)?.status ??
    (err as { statusCode?: number } | null)?.statusCode;
  return typeof status === 'number' && status >= 400 && status < 500;
}


/**
 * Global React Query configuration.
 *
 * Defaults tuned for VISÃO's realtime-heavy surface:
 * - `staleTime: 60s` — evita refetches em foco/mount para dados de dashboard
 *   que já são atualizados via Supabase Realtime.
 * - `gcTime: 5min` — mantém cache quente entre navegações rápidas.
 * - `retry` com backoff exponencial cap 30s, exceto 4xx (não faz sentido
 *   repetir erros de auth/validação).
 * - `refetchOnWindowFocus: false` — Realtime já sincroniza; refocar aba
 *   causava tempestade de queries em setups de vídeo-wall.
 * - `refetchOnReconnect: true` — recuperação rápida após queda de rede.
 */
export const QueryProvider = ({ children }: { children: ReactNode }) => {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            gcTime: 5 * 60 * 1000,
            refetchOnWindowFocus: false,
            refetchOnReconnect: true,
            retry: (failureCount, error) => {
              const status = (error as { status?: number; statusCode?: number } | null)?.status
                ?? (error as { statusCode?: number } | null)?.statusCode;
              if (typeof status === 'number' && status >= 400 && status < 500) return false;
              return failureCount < 3;
            },
            retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30_000),
          },
          mutations: {
            retry: (failureCount, error) => {
              const status = (error as { status?: number; statusCode?: number } | null)?.status
                ?? (error as { statusCode?: number } | null)?.statusCode;
              if (typeof status === 'number' && status >= 400 && status < 500) return false;
              return failureCount < 1;
            },
          },
        },
      }),
  );
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};
