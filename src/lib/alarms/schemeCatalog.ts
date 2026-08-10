/**
 * Onda 220 — Catálogo real de origens e bibliotecas para o esquema de alarme.
 *
 * Até a Onda 219 o operador **digitava** identificadores. Digitar um UUID é
 * um convite ao erro silencioso: um caractere trocado produz um esquema que
 * passa em todas as guardas (o texto é sintaticamente válido) e nunca dispara,
 * porque aponta para uma câmera que não existe. Cobertura falsa é a pior
 * falha possível num sistema de alarme.
 *
 * Este módulo é a régua única da **reconciliação** entre o que foi escolhido e
 * o que existe. Ele não busca nada (sem rede, sem relógio): recebe o catálogo
 * já lido e decide.
 *
 * Leis (K1..K7):
 *
 *  K1. Seleção **nunca** é apagada por ausência no catálogo. Um id escolhido
 *      que sumiu vira `missingIds` — que alimenta `missingSourceIds` (S3) e
 *      aparece como degradação. Remover em silêncio esconderia o buraco de
 *      cobertura exatamente de quem precisa vê-lo.
 *  K2. Sem prova não há acusação: catálogo desconhecido (carregando ou com
 *      erro) produz `catalogKnown:false` e `missingIds` vazio. Uma falha de
 *      rede jamais vira "seu dispositivo foi removido".
 *  K3. Ordem de seleção preservada; duplicatas colapsam na primeira ocorrência.
 *  K4. Entrada hostil nunca lança: não-array, não-string, vazios e espaços
 *      são descartados na entrada, não no meio do julgamento.
 *  K5. Catálogo com ids repetidos: a primeira ocorrência vence, para que o
 *      rótulo exibido seja estável entre renders.
 *  K6. `toggleSelection` é idempotente e reversível **inclusive para ids
 *      ausentes** — senão o operador ficaria preso a um fantasma que não
 *      consegue desmarcar.
 *  K7. Vínculo biblioteca→dispositivo só é declarado quando conhecido. Passar
 *      uma lista vazia como se fosse verdade transformaria S6 em recusa falsa
 *      ("biblioteca não pertence a nenhuma origem") durante o carregamento.
 */

import type { FaceLibraryBinding, SchemeContext } from './alarmScheme';

/* ------------------------------------------------------------------ *
 * Tipos
 * ------------------------------------------------------------------ */

export interface CatalogOption {
  readonly id: string;
  readonly label: string;
  /** Rótulo secundário (local da câmera, contagem de faces...). Opcional. */
  readonly hint?: string;
}

export interface CatalogSnapshot {
  /** `false` enquanto carrega ou quando a leitura falhou (K2). */
  readonly known: boolean;
  readonly options: readonly CatalogOption[];
}

export interface SelectionView {
  /** Ids escolhidos, na ordem em que foram escolhidos (K3). */
  readonly selected: readonly string[];
  /** Escolhidos que existem no catálogo, com rótulo. */
  readonly present: readonly CatalogOption[];
  /** Escolhidos ausentes do catálogo (K1). Vazio quando `catalogKnown` é falso. */
  readonly missingIds: readonly string[];
  /** Disponíveis ainda não escolhidos. */
  readonly available: readonly CatalogOption[];
  readonly catalogKnown: boolean;
}

/* ------------------------------------------------------------------ *
 * Saneamento (K4)
 * ------------------------------------------------------------------ */

export function sanitizeIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (typeof item !== 'string') continue;
    const id = item.trim();
    if (id.length === 0 || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

/** K5 — primeira ocorrência vence; entradas malformadas caem fora. */
export function sanitizeCatalog(snapshot: CatalogSnapshot | null | undefined): CatalogSnapshot {
  if (!snapshot || typeof snapshot !== 'object') return { known: false, options: [] };
  const options: CatalogOption[] = [];
  const seen = new Set<string>();
  const raw = Array.isArray(snapshot.options) ? snapshot.options : [];
  for (const option of raw) {
    if (!option || typeof option !== 'object') continue;
    const id = typeof option.id === 'string' ? option.id.trim() : '';
    if (id.length === 0 || seen.has(id)) continue;
    seen.add(id);
    const label =
      typeof option.label === 'string' && option.label.trim().length > 0 ? option.label.trim() : id;
    const hint =
      typeof option.hint === 'string' && option.hint.trim().length > 0
        ? option.hint.trim()
        : undefined;
    options.push(hint === undefined ? { id, label } : { id, label, hint });
  }
  return { known: snapshot.known === true, options };
}

/* ------------------------------------------------------------------ *
 * Reconciliação
 * ------------------------------------------------------------------ */

export function reconcileSelection(
  selectedRaw: unknown,
  snapshotRaw: CatalogSnapshot | null | undefined
): SelectionView {
  const selected = sanitizeIds(selectedRaw);
  const snapshot = sanitizeCatalog(snapshotRaw);
  const byId = new Map(snapshot.options.map((o) => [o.id, o] as const));

  const present: CatalogOption[] = [];
  const missingIds: string[] = [];

  for (const id of selected) {
    const option = byId.get(id);
    if (option) present.push(option);
    // K2: sem catálogo conhecido, ausência não é fato.
    else if (snapshot.known) missingIds.push(id);
  }

  const chosen = new Set(selected);
  const available = snapshot.options.filter((o) => !chosen.has(o.id));

  return {
    selected,
    present,
    missingIds,
    available,
    catalogKnown: snapshot.known,
  };
}

/** K6 — alterna a presença do id preservando a ordem dos demais. */
export function toggleSelection(selectedRaw: unknown, id: unknown): string[] {
  const target = typeof id === 'string' ? id.trim() : '';
  const selected = sanitizeIds(selectedRaw);
  if (target.length === 0) return selected;
  return selected.includes(target) ? selected.filter((x) => x !== target) : [...selected, target];
}

/** Seleção exclusiva (S6 aceita exatamente uma biblioteca). */
export function selectSingle(selectedRaw: unknown, id: unknown): string[] {
  const target = typeof id === 'string' ? id.trim() : '';
  if (target.length === 0) return [];
  const selected = sanitizeIds(selectedRaw);
  return selected.length === 1 && selected[0] === target ? [] : [target];
}

/* ------------------------------------------------------------------ *
 * Contexto para a régua (S6)
 * ------------------------------------------------------------------ */

export interface FaceLibraryOption extends CatalogOption {
  /** Dispositivos que efetivamente carregam esta biblioteca. */
  readonly deviceIds: readonly string[];
}

/**
 * K7 — só devolve `faceLibraries` quando o catálogo é conhecido. Um `[]`
 * durante o carregamento faria S6 recusar bibliotecas legítimas.
 */
export function buildSchemeContext(
  libraries: readonly FaceLibraryOption[] | null | undefined,
  known: boolean
): SchemeContext {
  if (!known || !Array.isArray(libraries)) return {};
  const bindings: FaceLibraryBinding[] = [];
  const seen = new Set<string>();
  for (const lib of libraries) {
    const libraryId = typeof lib?.id === 'string' ? lib.id.trim() : '';
    if (libraryId.length === 0 || seen.has(libraryId)) continue;
    seen.add(libraryId);
    bindings.push({ libraryId, deviceIds: sanitizeIds(lib.deviceIds) });
  }
  return { faceLibraries: bindings };
}

/** Texto usado pelo formulário (o estado do form é texto, Onda 218). */
export const idsToText = (ids: readonly string[]): string => ids.join(', ');
