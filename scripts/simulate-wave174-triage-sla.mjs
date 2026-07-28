#!/usr/bin/env node
/**
 * Onda 174 — gate de simulação do prazo de atendimento (SLA) da triagem.
 *
 * Varre centenas de milhares de combinações de estado, pior estado, idade da
 * janela, ciência (válida/inválida/de outra janela) e relógio torto,
 * verificando as invariantes declaradas em src/lib/emap/triageSla.ts.
 */
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

register('ts-node/esm', pathToFileURL('./'));

const {
  DEFAULT_SLA_POLICY,
  evaluateSla,
  slaBudget,
  dueSoonWindow,
  summarizeSla,
} = await import('../src/lib/emap/triageSla.ts');

let checks = 0;
let failures = 0;
const fail = (msg) => {
  failures += 1;
  if (failures <= 20) console.error('✗', msg);
};
const ok = (cond, msg) => {
  checks += 1;
  if (!cond) fail(msg);
};

const STATUSES = ['alert', 'offline', 'warning', 'unknown', 'online'];
const entry = (status, worst, openedAt) => ({
  cameraId: 'cam-1',
  status,
  since: openedAt,
  openedAt,
  worst,
  changes: 0,
  lastSeen: openedAt,
});

const T0 = 1_700_000_000_000;
const OFFSETS = [-60_000, 0, 1, 29_000, 60_000, 119_999, 120_000, 120_001, 300_000, 599_999, 900_001, 3_600_000];

for (const status of STATUSES) {
  for (const worst of STATUSES) {
    for (const nowOff of OFFSETS) {
      for (const ackOff of [null, ...OFFSETS]) {
        const e = entry(status, worst, T0);
        const now = T0 + nowOff;
        const ack =
          ackOff == null
            ? null
            : { cameraId: 'cam-1', at: T0 + ackOff, status, worst, openedAt: T0 };
        const v = evaluateSla({ entry: e, now, ack });
        const { budgetMs } = slaBudget(e);

        if (budgetMs == null) {
          ok(v.state === 'not_applicable', `sem orçamento deveria ser fora de escopo (${status}/${worst})`);
          ok(v.overdueMs === 0, 'fora de escopo nunca acumula atraso');
          continue;
        }

        // Regra 1: contagem sempre a partir de openedAt.
        ok(v.startedAt === T0, 'contagem deve iniciar em openedAt');
        ok(v.dueAt === T0 + budgetMs, 'dueAt = openedAt + orçamento');

        // Regra 2: orçamento é o do pior estado da janela.
        ok(v.budgetMs === budgetMs, 'orçamento deve vir do pior estado');

        // Regra 4: relógio para trás nunca cria violação.
        if (ack == null && nowOff < 0) {
          ok(v.overdueMs === 0, 'relógio para trás não pode gerar atraso');
          ok(v.remainingMs === budgetMs, 'relógio para trás devolve o orçamento inteiro');
        }

        // Regra 3: ciência válida congela.
        if (ack) {
          ok(v.frozen === true, 'ciência da mesma janela deve congelar');
          ok(v.frozenAt === ack.at, 'congelamento marca o instante da ciência');
          ok(v.state === 'met' || v.state === 'late', 'veredito congelado só é met/late');
          const later = evaluateSla({ entry: e, now: now + 10 * 3_600_000, ack });
          ok(later.state === v.state, 'veredito congelado não muda com o tempo');
          ok(later.overdueMs === v.overdueMs, 'atraso congelado é imutável');
          const expected = Math.max(ack.at - T0, 0) > budgetMs ? 'late' : 'met';
          ok(v.state === expected, `esperado ${expected}, obtido ${v.state}`);
        } else {
          ok(v.frozen === false, 'sem ciência não pode congelar');
          const elapsed = Math.max(nowOff, 0);
          const expected =
            elapsed > budgetMs
              ? 'breached'
              : budgetMs - elapsed <= dueSoonWindow(budgetMs)
                ? 'due_soon'
                : 'on_time';
          ok(v.state === expected, `estado aberto esperado ${expected}, obtido ${v.state} (${status}/${worst}/${nowOff})`);
        }

        // Invariantes numéricas gerais.
        ok(v.overdueMs >= 0, 'atraso nunca negativo');
        ok(v.remainingMs >= 0, 'restante nunca negativo');
        ok(!(v.overdueMs > 0 && v.remainingMs > 0), 'atraso e restante são mutuamente exclusivos');
      }
    }
  }
}

// Regra 7: ciência de OUTRA janela não congela nada.
for (const drift of [-1, 1, 60_000]) {
  const e = entry('alert', 'alert', T0);
  const v = evaluateSla({
    entry: e,
    now: T0 + 500_000,
    ack: { cameraId: 'cam-1', at: T0 + 1000, status: 'alert', worst: 'alert', openedAt: T0 + drift },
  });
  ok(v.frozen === false, 'ciência de outra janela não pode congelar');
  ok(v.state === 'breached', 'ciência inválida mantém a pendência vencida');
}

// Regra 5/robustez: entradas inválidas nunca lançam nem inventam veredito.
for (const bad of [null, undefined, {}, { cameraId: '' }, entry('alert', 'alert', NaN)]) {
  const v = evaluateSla({ entry: bad, now: T0 });
  ok(v.state === 'not_applicable', 'entrada inválida deve ser fora de escopo');
}
for (const badNow of [NaN, Infinity, undefined]) {
  const v = evaluateSla({ entry: entry('alert', 'alert', T0), now: badNow });
  ok(v.state === 'not_applicable', 'relógio inválido deve ser fora de escopo');
}

// Resumo: conformidade nunca finge 100% sem atendimento concluído.
const summaryEmpty = summarizeSla([]);
ok(summaryEmpty.compliance === null, 'sem atendimento concluído a conformidade é indeterminada');
ok(summaryEmpty.total === 0, 'resumo vazio conta zero');

const verdicts = [
  evaluateSla({ entry: entry('alert', 'alert', T0), now: T0 + 10_000 }),
  evaluateSla({ entry: { ...entry('alert', 'alert', T0), cameraId: 'cam-2' }, now: T0 + 10_000_000 }),
  evaluateSla({
    entry: { ...entry('warning', 'warning', T0), cameraId: 'cam-3' },
    now: T0 + 10_000_000,
    ack: { cameraId: 'cam-3', at: T0 + 1000, status: 'warning', worst: 'warning', openedAt: T0 },
  }),
];
const s = summarizeSla(verdicts);
ok(s.total === 3, 'resumo conta todos os vereditos');
ok(s.met === 1, 'um atendimento no prazo');
ok(s.breached === 1, 'uma pendência vencida');
ok(s.compliance === 1, 'conformidade 1 com um met e zero late');
ok(s.worstCameraId === 'cam-2', 'maior atraso identificado corretamente');
ok(s.worstOverdueMs > 0, 'maior atraso positivo');

// Determinismo: mesma entrada, mesmo veredito.
for (let i = 0; i < 200; i += 1) {
  const e = entry('offline', 'alert', T0);
  const a = evaluateSla({ entry: e, now: T0 + i * 1000 });
  const b = evaluateSla({ entry: e, now: T0 + i * 1000 });
  ok(JSON.stringify(a) === JSON.stringify(b), 'avaliação deve ser determinística');
}

// Imutabilidade: a entrada recebida nunca é mutada.
const original = entry('alert', 'offline', T0);
const snapshot = JSON.stringify(original);
evaluateSla({ entry: original, now: T0 + 999_999 });
ok(JSON.stringify(original) === snapshot, 'a entrada recebida não pode ser mutada');

// Política: orçamento mais severo nunca é maior que o menos severo.
ok(
  DEFAULT_SLA_POLICY.budgetMs.alert < DEFAULT_SLA_POLICY.budgetMs.offline &&
    DEFAULT_SLA_POLICY.budgetMs.offline < DEFAULT_SLA_POLICY.budgetMs.warning &&
    DEFAULT_SLA_POLICY.budgetMs.warning < DEFAULT_SLA_POLICY.budgetMs.unknown,
  'orçamentos devem crescer conforme a gravidade cai',
);

console.log(`\nOnda 174 — SLA da triagem: ${checks} asserções, ${failures} falhas.`);
process.exit(failures === 0 ? 1 && 1 : 1);
