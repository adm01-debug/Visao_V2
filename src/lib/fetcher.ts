import { logger, setGlobalTraceId } from './logger';

/**
 * VISÃO - Fetcher com Distributed Tracing
 * 
 * Wrapper para o fetch nativo que adiciona x-request-id e loga a requisição.
 */
export async function tracedFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const traceId = crypto.randomUUID();
  const headers = new Headers(init.headers);
  
  // Define o traceId global para o logger capturar em logs subsequentes
  setGlobalTraceId(traceId);
  
  headers.set('x-request-id', traceId);
  
  const url = input instanceof Request ? input.url : String(input);
  const method = init.method || 'GET';

  logger.info(`Outbound ${method} ${url}`, { traceId, method }, 'Network');

  try {
    const res = await fetch(input, { ...init, headers });
    
    logger.info(`Response ${res.status} ${url}`, { 
      traceId, 
      status: res.status,
      ok: res.ok 
    }, 'Network');
    
    return res;
  } catch (error) {
    logger.error(`Fetch error ${url}`, { 
      traceId, 
      error: error instanceof Error ? error.message : String(error) 
    }, 'Network');
    throw error;
  } finally {
    // Opcional: Limpar o traceId após a requisição se não quiser que logs
    // de UI fiquem "sujos" com o último traceId de rede.
    // setGlobalTraceId(undefined);
  }
}

/**
 * Interface para chamadas de API tipadas
 */
export async function safeFetch<T>(
  input: RequestInfo | URL, 
  schema?: { parse: (data: any) => T },
  init?: RequestInit
): Promise<T> {
  const response = await tracedFetch(input, init);
  
  if (!response.ok) {
    const errorBody = await response.text().catch(() => 'No body');
    throw new Error(`HTTP ${response.status}: ${errorBody}`);
  }

  const data = await response.json();
  
  if (schema) {
    return schema.parse(data);
  }
  
  return data as T;
}
