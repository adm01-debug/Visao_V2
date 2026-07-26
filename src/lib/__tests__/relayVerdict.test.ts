/**
 * Onda 120 — testes do veredito de surdez.
 *
 * O que estes testes protegem é caro: um falso positivo aqui reinicia agentes
 * saudáveis em campo; um falso negativo deixa um agente mudo sem cura. Por isso
 * cada caso descreve uma situação operacional real, não um estado abstrato.
 */
import { describe, it, expect } from 'vitest';
import {
  BACKEND_ABANDON_ERRORS,
  DEFAULT_VERDICT_POLICY,
  classifyEvidence,
  classifyOutcome,
  conformantTtlSeconds,
  judge,
  tallyEvidence,
  type RelayTaskFacts,
} from '../relayVerdict';

/** Tarefa com janela justa por padrão — cada teste altera só o que importa. */
function tarefa(over: Partial<RelayTaskFacts> = {}): RelayTaskFacts {
  return {
    status: 'expired',
    error: null,
    claimed: false,
    expired: true,
    windowSeconds: 60,
    ...over,
  } as RelayTaskFacts;
}

describe('classifyOutcome — desfecho canônico', () => {
  it('trata desistência do backend como causa nossa, mesmo com janela justa', () => {
    for (const err of BACKEND_ABANDON_ERRORS) {
      expect(classifyOutcome(tarefa({ error: err, windowSeconds: 600 }))).toBe('backend_abandoned');
    }
  });

  it('classifica resposta com erro do alvo como resposta, não como silêncio', () => {
    expect(classifyOutcome(tarefa({ status: 'failed', error: 'camera_401', claimed: true })))
      .toBe('failed');
  });

  it('separa silêncio sem claim de travamento após claim', () => {
    expect(classifyOutcome(tarefa({ claimed: false }))).toBe('expired_unclaimed');
    expect(classifyOutcome(tarefa({ claimed: true }))).toBe('expired_no_response');
  });

  it('descarta janela mais curta que a política, ainda que sem erro registrado', () => {
    expect(classifyOutcome(tarefa({ windowSeconds: 59 }))).toBe('expired_unfair_window');
    expect(classifyOutcome(tarefa({ error: 'task_expired_unfair_window', windowSeconds: 3600 })))
      .toBe('expired_unfair_window');
  });

  it('não julga tarefa ainda em voo', () => {
    expect(classifyOutcome(tarefa({ status: 'pending', expired: false }))).toBe('pending');
  });
});

describe('classifyEvidence — peso da prova', () => {
  it('conta done e failed como prova de vida (D2)', () => {
    expect(classifyEvidence('done')).toBe('alive');
    expect(classifyEvidence('failed')).toBe('alive');
  });

  it('conta como surdez apenas silêncio do próprio agente', () => {
    expect(classifyEvidence('expired_unclaimed')).toBe('deaf');
    expect(classifyEvidence('expired_no_response')).toBe('deaf');
  });

  it('neutraliza causas nossas e tarefas em voo (D1/D3)', () => {
    expect(classifyEvidence('backend_abandoned')).toBe('inconclusive');
    expect(classifyEvidence('expired_unfair_window')).toBe('inconclusive');
    expect(classifyEvidence('pending')).toBe('inconclusive');
  });
});

describe('judge — decisão de reinício', () => {
  const min = DEFAULT_VERDICT_POLICY.minSample;

  it('não acusa agente cujas tarefas voltaram com erro de câmera', () => {
    const t = tallyEvidence(
      Array.from({ length: 12 }, () => tarefa({ status: 'failed', error: 'camera_401', claimed: true })),
    );
    const v = judge(t);
    expect(t.alive).toBe(12);
    expect(t.deaf).toBe(0);
    expect(v.deaf).toBe(false);
  });

  it('não acusa agente quando fomos nós que desistimos de esperar', () => {
    const t = tallyEvidence(
      Array.from({ length: 12 }, () => tarefa({ error: 'relay_backend_abandoned', windowSeconds: 60 })),
    );
    expect(t.deaf).toBe(0);
    expect(t.inconclusive).toBe(12);
    // Amostra conclusiva vazia: silêncio de dados nunca vira condenação.
    expect(judge(t).deafRatio).toBeNull();
    expect(judge(t).deaf).toBe(false);
  });

  it('continua acusando silêncio real com janela justa (sensor não cegou)', () => {
    const t = tallyEvidence(Array.from({ length: 12 }, () => tarefa()));
    const v = judge(t);
    expect(t.deaf).toBe(12);
    expect(v.deafRatio).toBe(1);
    expect(v.deaf).toBe(true);
  });

  it('não dilui a taxa com linhas inconclusivas', () => {
    const semRuido = judge(tallyEvidence([
      ...Array.from({ length: 6 }, () => tarefa()),
      ...Array.from({ length: 6 }, () => tarefa({ status: 'done', expired: false, error: null })),
    ]));
    const comRuido = judge(tallyEvidence([
      ...Array.from({ length: 6 }, () => tarefa()),
      ...Array.from({ length: 6 }, () => tarefa({ status: 'done', expired: false, error: null })),
      ...Array.from({ length: 50 }, () => tarefa({ error: 'backend_timeout' })),
    ]));
    expect(comRuido.deafRatio).toBe(semRuido.deafRatio);
  });

  it('se abstém quando a amostra conclusiva é pequena', () => {
    const v = judge(tallyEvidence(Array.from({ length: min - 1 }, () => tarefa())));
    expect(v.deafRatio).toBeNull();
    expect(v.deaf).toBe(false);
  });

  it('é monotônico: trocar prova de vida por silêncio nunca reduz a taxa', () => {
    let anterior = -1;
    for (let deaf = 0; deaf <= 20; deaf += 1) {
      const v = judge({ alive: 20 - deaf, deaf, inconclusive: 7 });
      expect(v.deafRatio).not.toBeNull();
      expect(v.deafRatio as number).toBeGreaterThanOrEqual(anterior);
      anterior = v.deafRatio as number;
    }
  });
});

describe('conformantTtlSeconds — conformidade do produtor', () => {
  it('nunca fica abaixo da janela justa, mesmo com espera curta', () => {
    expect(conformantTtlSeconds(1_000)).toBe(DEFAULT_VERDICT_POLICY.fairWindowSeconds);
    expect(conformantTtlSeconds(0)).toBe(DEFAULT_VERDICT_POLICY.fairWindowSeconds);
  });

  it('cobre integralmente a espera real do backend quando ela é maior', () => {
    expect(conformantTtlSeconds(90_000)).toBe(90);
    expect(conformantTtlSeconds(25_500)).toBe(DEFAULT_VERDICT_POLICY.fairWindowSeconds);
  });

  it('gera TTL que torna toda tarefa diagnosticável', () => {
    for (let ms = 0; ms <= 120_000; ms += 500) {
      const ttl = conformantTtlSeconds(ms);
      expect(ttl).toBeGreaterThanOrEqual(DEFAULT_VERDICT_POLICY.fairWindowSeconds);
      expect(ttl * 1000).toBeGreaterThanOrEqual(ms);
      expect(classifyOutcome(tarefa({ windowSeconds: ttl }))).not.toBe('expired_unfair_window');
    }
  });
});
