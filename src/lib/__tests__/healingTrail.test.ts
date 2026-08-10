import { describe, expect, it } from 'vitest';
import {
  ACTION_LABEL,
  ACTION_TONE,
  explainHealingDecision,
  isRestrained,
  summarizeHealingTrail,
  type HealingTrailAction,
} from '../agents/healingTrail';

/** Textos canônicos do SQL (`arbitrate_agent_healing` / `heal_local_agents`). */
const LADDER = 'sem heartbeat há 12 min';
const EXTERNAL_VETO =
  'causa raiz externa atribuída a este episódio: reinício derrubaria streams sem tocar no defeito real';
const REDELIVERY_CRITICAL =
  'heartbeat saudável, mas a fila só fecha por reentrega: degradação real fora do alcance da escada';
const REDELIVERY_WARNING =
  'heartbeat saudável com reentrega acima do esperado: episódio registrado para acompanhamento';
const EXPLAINED = 'reentrega acima do esperado, porém já explicada por causa raiz externa';
const LIVENESS =
  'agente concluiu 3 entrega(s) na janela: prova de vida rebaixa o reinício a sondagem';
const BREAKER =
  'reinício suprimido pelo disjuntor de falha correlacionada: 45% da frota silenciosa';
const BUDGET =
  'reinício adiado para a próxima varredura: orçamento efetivo 2 (frota 60, janela 60)';

const withArbiter = (arbiter: string) => `${LADDER} [árbitro: ${arbiter}]`;

describe('healingTrail — T1 rótulo e tom para toda ação', () => {
  const actions: HealingTrailAction[] = [
    'observe',
    'nudge',
    'restart',
    'escalate',
    'defer',
    'suppress',
  ];

  it.each(actions)('%s tem rótulo e tom', (action) => {
    expect(ACTION_LABEL[action]).toBeTruthy();
    expect(ACTION_TONE[action]).toBeTruthy();
  });

  it('observe nunca é apresentado como sucesso', () => {
    expect(ACTION_TONE.observe).not.toBe('neutral');
    expect(ACTION_TONE.observe).toBe('info');
  });

  it('classifica ações contidas', () => {
    expect(isRestrained('observe')).toBe(true);
    expect(isRestrained('defer')).toBe(true);
    expect(isRestrained('suppress')).toBe(true);
    expect(isRestrained('restart')).toBe(false);
  });
});

describe('healingTrail — T2..T4 separação do sufixo do árbitro', () => {
  it('T3 extrai o veto sem perder o motivo da escada', () => {
    const out = explainHealingDecision({ action: 'observe', reason: withArbiter(EXTERNAL_VETO) });
    expect(out.ladderReason).toBe(LADDER);
    expect(out.arbiterReason).toBe(EXTERNAL_VETO);
    expect(out.overridden).toBe(true);
  });

  it('T4 sem sufixo não há veto', () => {
    const out = explainHealingDecision({
      action: 'nudge',
      reason: 'decisão da escada de cura mantida',
    });
    expect(out.arbiterReason).toBeNull();
    expect(out.overridden).toBe(false);
    expect(out.rule).toBe('ladder_kept');
  });

  it('T2 o texto cru é sempre recuperável', () => {
    const raw = withArbiter(REDELIVERY_WARNING);
    expect(explainHealingDecision({ action: 'observe', reason: raw }).rawReason).toBe(raw);
  });

  it('preserva a causa externa anexada após o veto', () => {
    const raw = `${LADDER} [árbitro: ${EXTERNAL_VETO}; relógio da câmera 12 fora de sincronia]`;
    const out = explainHealingDecision({ action: 'observe', reason: raw });
    expect(out.arbiterReason).toContain('relógio da câmera 12');
    expect(out.rule).toBe('external_root_cause_veto');
  });
});

describe('healingTrail — T5 cada regra do árbitro é reconhecida', () => {
  const cases: Array<[string, string, string]> = [
    [EXTERNAL_VETO, 'external_root_cause_veto', 'observe'],
    [EXPLAINED, 'external_cause_explains_redelivery', 'observe'],
    [REDELIVERY_CRITICAL, 'redelivery_only_critical', 'observe'],
    [REDELIVERY_WARNING, 'redelivery_only_warning', 'observe'],
    [LIVENESS, 'liveness_downgrade', 'nudge'],
  ];

  it.each(cases)('%s → %s', (reason, rule, action) => {
    const out = explainHealingDecision({
      action: action as HealingTrailAction,
      reason: withArbiter(reason),
    });
    expect(out.rule).toBe(rule);
    expect(out.ruleLabel).not.toBe('Motivo não catalogado');
  });
});

describe('healingTrail — T6/T7 vetos de orçamento e contrafactual', () => {
  it('T6 suppress é veto do disjuntor', () => {
    const out = explainHealingDecision({ action: 'suppress', reason: BREAKER });
    expect(out.rule).toBe('breaker_suppressed');
    expect(out.overridden).toBe(true);
    expect(out.arbiterReason).toBeNull();
  });

  it('T6 defer é veto de orçamento', () => {
    const out = explainHealingDecision({ action: 'defer', reason: BUDGET });
    expect(out.rule).toBe('budget_deferred');
    expect(out.counterfactual).toContain('adiado');
  });

  it('T7 sem veto não há contrafactual', () => {
    const out = explainHealingDecision({
      action: 'nudge',
      reason: 'decisão da escada de cura mantida',
    });
    expect(out.counterfactual).toBeNull();
  });

  it('T7 veto invasivo explica o que foi impedido', () => {
    const out = explainHealingDecision({ action: 'observe', reason: withArbiter(EXTERNAL_VETO) });
    expect(out.counterfactual).toContain('reiniciado');
  });
});

describe('healingTrail — T8/T9 robustez e pureza', () => {
  it('T8 entrada vazia não lança', () => {
    const out = explainHealingDecision({ action: 'observe', reason: '' });
    expect(out.rule).toBe('unknown');
    expect(out.rawReason).toBe('');
  });

  it('T8 colchete não fechado preserva o texto', () => {
    const raw = `${LADDER} [árbitro: ${EXTERNAL_VETO}`;
    const out = explainHealingDecision({ action: 'observe', reason: raw });
    expect(out.ladderReason).toBe(raw);
    expect(out.arbiterReason).toBeNull();
  });

  it('T8 motivo desconhecido nunca é descartado', () => {
    const out = explainHealingDecision({ action: 'observe', reason: withArbiter('regra futura') });
    expect(out.rule).toBe('unknown');
    expect(out.arbiterReason).toBe('regra futura');
  });

  it('T9 é idempotente', () => {
    const input = { action: 'observe' as const, reason: withArbiter(REDELIVERY_CRITICAL) };
    expect(explainHealingDecision(input)).toEqual(explainHealingDecision(input));
  });
});

describe('healingTrail — resumo agregado', () => {
  it('conta observados, contidos e regras', () => {
    const summary = summarizeHealingTrail([
      { action: 'observe', reason: withArbiter(EXTERNAL_VETO) },
      { action: 'observe', reason: withArbiter(EXTERNAL_VETO) },
      { action: 'observe', reason: withArbiter(REDELIVERY_CRITICAL) },
      { action: 'defer', reason: BUDGET },
      { action: 'suppress', reason: BREAKER },
    ]);

    expect(summary.total).toBe(5);
    expect(summary.observed).toBe(3);
    expect(summary.vetoed).toBe(2);
    expect(summary.byRule[0]).toEqual({
      rule: 'external_root_cause_veto',
      label: 'Causa raiz externa',
      count: 2,
    });
  });

  it('lista vazia é neutra', () => {
    expect(summarizeHealingTrail([])).toEqual({
      total: 0,
      observed: 0,
      vetoed: 0,
      byRule: [],
    });
  });
});
