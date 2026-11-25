/**
 * Teto de espera das leituras que alimentam a tela.
 *
 * Sem ele, uma resposta que nunca chega mantem `loading` em `true` para sempre
 * e a pagina fica presa no skeleton — sem heading, sem estado de erro e sem
 * chance de o usuario perceber que a busca falhou.
 */
export const QUERY_TIMEOUT_MS = 20_000;

export const querySignal = (): AbortSignal => {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), QUERY_TIMEOUT_MS);
  return controller.signal;
};
