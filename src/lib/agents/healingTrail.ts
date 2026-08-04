/**
 * Onda 140 — leitura humana do rastro de decisão do auto-healing.
 *
 * O banco guarda a decisão como uma única string em `agent_healing_actions.reason`,
 * montada por `heal_local_agents()` no formato:
 *
 *     "<motivo da escada> [árbitro: <motivo do veto>; <causa externa>]"
 *
 * O sufixo entre colchetes só existe quando o árbitro (Onda 123) *mudou* o que a
 * escada de cura (Onda 115) havia decidido. Para as ações de orçamento
 * (`defer`/`suppress`, Onda 118) não há sufixo: a string inteira já é o motivo
 * do bloqueio.
 *
 * Este módulo não inventa informação — ele apenas separa as duas metades e
 * reconhece a regra que produziu o veto, para que a UI consiga responder à
 * pergunta que importa ao operador: *o que teria acontecido se ninguém tivesse
 * vetado?* Um rastro que só diz "observe" sem dizer o que foi impedido é
 * indistinguível de um sistema que não fez nada.
 *
 * Regra de robustez: motivo desconhecido NUNCA é descartado. Cai em
 * `ladder_kept`/`unknown` e o texto cru continua visível. Um parser que engole
 * o que não reconhece é pior que nenhum parser, porque esconde justamente o
 * caso novo que o operador precisa ver.
 *
 * Invariantes cobertas por `__tests__/healingTrail.test.ts` (T1..T9):
 *   T1 toda ação conhecida tem rótulo e tom
 *   T2 o texto cru é sempre recuperável em `rawReason`
 *   T3 `[árbitro: ...]` é extraído sem perder o motivo da escada
 *   T4 ausência do sufixo ⇒ `arbiterReason === null` e `overridden === false`
 *   T5 cada regra do árbitro é reconhecida pelo seu texto canônico
 *   T6 `defer`/`suppress` classificam como veto de orçamento, não do árbitro
 *   T7 `counterfactual` só existe quando algo foi de fato impedido
 *   T8 entrada malformada (vazia, colchete não fechado) não lança
 *   T9 a função é pura e idempotente
 */

/** Espelha o CHECK de `agent_healing_actions.action`. */
export type HealingTrailAction =
  'nudge' | 'restart' | 'escalate' | 'defer' | 'suppress' | 'observe';

export type HealingTrailSeverity = 'ok' | 'warning' | 'critical';

export type HealingTrailTone = 'neutral' | 'info' | 'warning' | 'destructive';

/**
 * Regra que produziu a decisão. Os nomes seguem as âncoras R0..R3 documentadas
 * em `relayHealingArbiter.ts` mais os dois bloqueios de orçamento da Onda 118.
 */
export type HealingTrailRule =
  | 'external_root_cause_veto'
  | 'external_cause_explains_redelivery'
  | 'external_cause_non_invasive'
  | 'liveness_downgrade'
  | 'redelivery_only_critical'
  | 'redelivery_only_warning'
  | 'escalation_exhausted'
  | 'breaker_suppressed'
  | 'budget_deferred'
  | 'ladder_kept'
  | 'unknown';

export interface HealingTrailEntry {
  readonly id: string;
  readonly agentId: string;
  readonly agentName: string | null;
  readonly action: HealingTrailAction;
  readonly severity: HealingTrailSeverity;
  readonly reason: string;
  readonly silentMinutes: number | null;
  readonly deafRatio: number | null;
  readonly attempts: number;
  readonly createdAt: string;
}

export interface HealingTrailExplanation {
  /** Motivo produzido pela escada de cura, sem o sufixo do árbitro. */
  readonly ladderReason: string;
  /** Motivo do veto do árbitro, ou `null` quando a escada foi respeitada. */
  readonly arbiterReason: string | null;
  /** `true` quando o árbitro ou o orçamento alteraram a decisão da escada. */
  readonly overridden: boolean;
  readonly rule: HealingTrailRule;
  /** Rótulo curto da regra, para badge. */
  readonly ruleLabel: string;
  /** O que teria acontecido sem o veto. `null` quando nada foi impedido. */
  readonly counterfactual: string | null;
  /** Texto original íntegro, sempre disponível para auditoria. */
  readonly rawReason: string;
}

export const ACTION_LABEL: Record<HealingTrailAction, string> = {
  observe: 'Observado',
  nudge: 'Sondagem',
  restart: 'Reinício',
  escalate: 'Escalado',
  defer: 'Adiado',
  suppress: 'Suprimido',
};

/**
 * Tom por ação. `observe` é deliberadamente `info` e não `success`: nada foi
 * resolvido, apenas registrado. Pintar de verde ensinaria o operador a tratar
 * um episódio em aberto como episódio encerrado.
 */
export const ACTION_TONE: Record<HealingTrailAction, HealingTrailTone> = {
  observe: 'info',
  nudge: 'neutral',
  restart: 'warning',
  escalate: 'destructive',
  defer: 'warning',
  suppress: 'destructive',
};

/** Ações em que a máquina decidiu deliberadamente NÃO tocar no agente. */
export const RESTRAINED_ACTIONS: readonly HealingTrailAction[] = ['observe', 'defer', 'suppress'];

export function isRestrained(action: HealingTrailAction): boolean {
  return RESTRAINED_ACTIONS.includes(action);
}

interface RuleSpec {
  readonly rule: HealingTrailRule;
  readonly label: string;
  /** Trecho canônico que identifica a regra dentro do motivo gravado. */
  readonly needle: string;
  readonly counterfactual: string | null;
}

/**
 * Ordem importa: a primeira agulha encontrada vence. Textos canônicos copiados
 * literalmente de `arbitrate_agent_healing()` e `heal_local_agents()` — o gate
 * de CI compara estas constantes com o SQL vivo, então divergência quebra o
 * build em vez de degradar silenciosamente a explicação na tela.
 */
const RULE_SPECS: readonly RuleSpec[] = [
  {
    rule: 'external_root_cause_veto',
    label: 'Causa raiz externa',
    needle: 'reinício derrubaria streams sem tocar no defeito real',
    counterfactual:
      'Sem o veto, o agente teria sido reiniciado — derrubando as transmissões sem corrigir o defeito, que está fora dele.',
  },
  {
    rule: 'external_cause_explains_redelivery',
    label: 'Reentrega já explicada',
    needle: 'já explicada por causa raiz externa',
    counterfactual:
      'A reentrega acima do esperado seria tratada como falha do agente, quando a causa já está atribuída a outro componente.',
  },
  {
    rule: 'external_cause_non_invasive',
    label: 'Ação não invasiva mantida',
    needle: 'ação não invasiva mantida sob causa raiz externa',
    counterfactual: null,
  },
  {
    rule: 'liveness_downgrade',
    label: 'Prova de vida',
    needle: 'prova de vida rebaixa o reinício a sondagem',
    counterfactual:
      'Sem a prova de vida, o agente teria sido reiniciado apesar de estar concluindo entregas na janela.',
  },
  {
    rule: 'redelivery_only_critical',
    label: 'Degradação fora da escada',
    needle: 'a fila só fecha por reentrega',
    counterfactual:
      'A escada consideraria o agente saudável pelo heartbeat e nada seria registrado sobre a degradação real.',
  },
  {
    rule: 'redelivery_only_warning',
    label: 'Reentrega acima do esperado',
    needle: 'reentrega acima do esperado: episódio registrado para acompanhamento',
    counterfactual:
      'O episódio passaria despercebido: o heartbeat está saudável e a escada não teria aberto registro.',
  },
  {
    rule: 'escalation_exhausted',
    label: 'Tentativas esgotadas',
    needle: 'tentativas de cura esgotadas pela escada',
    counterfactual: null,
  },
  {
    rule: 'breaker_suppressed',
    label: 'Disjuntor acionado',
    needle: 'reinício suprimido pelo disjuntor de falha correlacionada',
    counterfactual:
      'Sem o disjuntor, uma falha correlacionada teria disparado reinícios simultâneos em boa parte da frota.',
  },
  {
    rule: 'budget_deferred',
    label: 'Orçamento esgotado',
    needle: 'reinício adiado para a próxima varredura',
    counterfactual:
      'O reinício foi apenas adiado: o orçamento da janela já estava consumido por agentes de maior prioridade.',
  },
  {
    rule: 'ladder_kept',
    label: 'Decisão da escada',
    needle: 'decisão da escada de cura mantida',
    counterfactual: null,
  },
];

const RULE_LABEL_FALLBACK: Record<'unknown', string> = { unknown: 'Motivo não catalogado' };

/** Marcador que `heal_local_agents()` usa para anexar o veto do árbitro. */
const ARBITER_PREFIX = '[árbitro:';

/**
 * Separa `"<escada> [árbitro: <veto>]"` em duas partes.
 * Colchete não fechado é tratado como texto comum — nunca lança.
 */
function splitArbiterSuffix(reason: string): { ladder: string; arbiter: string | null } {
  const start = reason.indexOf(ARBITER_PREFIX);
  if (start < 0) return { ladder: reason.trim(), arbiter: null };

  const end = reason.lastIndexOf(']');
  if (end <= start) {
    // Colchete de abertura sem fechamento: preservamos tudo do lado da escada
    // em vez de adivinhar onde o veto termina.
    return { ladder: reason.trim(), arbiter: null };
  }

  const ladder = reason.slice(0, start).trim();
  const arbiter = reason.slice(start + ARBITER_PREFIX.length, end).trim();
  return { ladder, arbiter: arbiter.length > 0 ? arbiter : null };
}

function matchRule(haystack: string): RuleSpec | null {
  for (const spec of RULE_SPECS) {
    if (haystack.includes(spec.needle)) return spec;
  }
  return null;
}

/**
 * Traduz uma linha de `agent_healing_actions` no rastro exibido na UI.
 * Pura: nenhuma leitura de relógio, nenhuma I/O.
 */
export function explainHealingDecision(
  entry: Pick<HealingTrailEntry, 'action' | 'reason'>
): HealingTrailExplanation {
  const raw = typeof entry.reason === 'string' ? entry.reason : '';
  const { ladder, arbiter } = splitArbiterSuffix(raw);

  // O veto do árbitro só é reconhecido dentro do sufixo; o de orçamento está no
  // texto inteiro (essas ações não passam pelo árbitro).
  const budgetVeto = entry.action === 'defer' || entry.action === 'suppress';
  const spec = matchRule(arbiter ?? (budgetVeto ? raw : ladder));

  const rule = spec?.rule ?? 'unknown';
  const overridden = arbiter !== null || budgetVeto;

  return {
    ladderReason: ladder,
    arbiterReason: arbiter,
    overridden,
    rule,
    ruleLabel: spec?.label ?? RULE_LABEL_FALLBACK.unknown,
    // T7: contrafactual só faz sentido quando algo foi de fato impedido.
    counterfactual: overridden ? (spec?.counterfactual ?? null) : null,
    rawReason: raw,
  };
}

export interface HealingTrailSummary {
  readonly total: number;
  readonly observed: number;
  readonly vetoed: number;
  readonly byRule: ReadonlyArray<{ rule: HealingTrailRule; label: string; count: number }>;
}

/** Agrega o rastro para o cabeçalho do painel, em ordem decrescente de volume. */
export function summarizeHealingTrail(
  entries: readonly Pick<HealingTrailEntry, 'action' | 'reason'>[]
): HealingTrailSummary {
  const counts = new Map<HealingTrailRule, { label: string; count: number }>();
  let observed = 0;
  let vetoed = 0;

  for (const entry of entries) {
    const explanation = explainHealingDecision(entry);
    if (entry.action === 'observe') observed++;
    if (entry.action === 'defer' || entry.action === 'suppress') vetoed++;

    const current = counts.get(explanation.rule);
    if (current) current.count++;
    else counts.set(explanation.rule, { label: explanation.ruleLabel, count: 1 });
  }

  const byRule = [...counts.entries()]
    .map(([rule, value]) => ({ rule, label: value.label, count: value.count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

  return { total: entries.length, observed, vetoed, byRule };
}
