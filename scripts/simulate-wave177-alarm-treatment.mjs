#!/usr/bin/env node
/**
 * Onda 177 — simulação exaustiva da tratativa de alarme.
 *
 * Verifica as 7 regras invioláveis de src/lib/alarms/alarmTreatment.ts contra
 * o produto cartesiano de estados × ações × autores × notas × códigos, mais
 * cadeias aleatórias longas (fuzz) que só podem terminar em estado alcançável.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const dir = mkdtempSync(join(tmpdir(), 'wave177-'));
const entry = join(dir, 'entry.mjs');
writeFileSync(
  entry,
  `export * from ${JSON.stringify(join(process.cwd(), 'src/lib/alarms/alarmTreatment.ts'))};`,
);
execFileSync(
  'npx',
  ['esbuild', entry, '--bundle', '--format=esm', '--platform=node', `--outfile=${join(dir, 'b.mjs')}`],
  { stdio: 'pipe' },
);
const M = await import(join(dir, 'b.mjs'));

let asserts = 0;
const failures = [];
const check = (cond, label) => {
  asserts += 1;
  if (!cond) failures.push(label);
};

const STATUSES = ['open', 'acknowledged', 'resolved', 'dismissed'];
const ACTIONS = ['acknowledge', 'resolve', 'dismiss', 'reopen'];
const LEGAL = {
  open: ['acknowledge', 'dismiss'],
  acknowledged: ['resolve', 'dismiss'],
  resolved: ['reopen'],
  dismissed: ['reopen'],
};
const CODES = [...M.RESOLUTION_CODES, 'bogus', '', null, undefined, '  '];
const NOTES = [null, undefined, '', '   ', 'ab', ' ok ', 'viatura acionada', 'x'.repeat(2001)];
const ACTORS = [null, undefined, '', '   ', 'op-1'];
const CLOCKS = [0, 1000, 5000, -1, Number.NaN, Infinity];

// ---- Regra 1: matriz completa de transições -------------------------------
for (const from of STATUSES) {
  for (const action of ACTIONS) {
    for (const actor of ACTORS) {
      for (const note of NOTES) {
        for (const code of CODES) {
          for (const now of CLOCKS) {
            const snap = { status: from, updatedAt: 4000 };
            const r = M.evaluateTreatment(snap, { action, actorId: actor, note, code, now });
            const legal = LEGAL[from].includes(action);

            if (!legal) {
              check(r.ok === false && r.reason === 'illegal_transition',
                `R1 ${from}->${action} deveria ser ilegal`);
              continue;
            }
            const actorOk = typeof actor === 'string' && actor.trim().length > 0;
            if (!actorOk) {
              check(r.ok === false && r.reason === 'missing_actor',
                `R3 ${from}/${action} sem autor`);
              continue;
            }
            const closing = action === 'resolve' || action === 'dismiss';
            const n = M.normalizeNote(note);
            if (closing) {
              if (n.length < M.MIN_NOTE_LENGTH) {
                check(r.ok === false && r.reason === 'missing_note', `R2 ${action} sem motivo`);
                continue;
              }
              if (n.length > M.MAX_NOTE_LENGTH) {
                check(r.ok === false && r.reason === 'note_too_long', `R2 nota longa`);
                continue;
              }
              const raw = typeof code === 'string' ? code.trim() : '';
              if (!M.RESOLUTION_CODES.includes(raw)) {
                check(r.ok === false && r.reason === 'invalid_code', `R2 código inválido`);
                continue;
              }
              if (!M.allowedCodes(action).includes(raw)) {
                check(r.ok === false && r.reason === 'code_not_allowed_for_action',
                  `R6 código ${raw} não vale para ${action}`);
                continue;
              }
            } else if (n.length > M.MAX_NOTE_LENGTH) {
              check(r.ok === false && r.reason === 'note_too_long', 'R2 nota longa (não encerrante)');
              continue;
            }

            check(r.ok === true, `aceite esperado ${from}/${action}`);
            if (r.ok) {
              // Regra 5: relógio nunca retrocede.
              check(r.at >= 4000, `R5 carimbo retrocedeu (${r.at})`);
              check(r.next.updatedAt === r.at, 'R5 updatedAt divergente');
              // Regra 3: autoria carimbada no encerramento.
              if (closing) {
                check(r.next.resolvedBy === actor.trim(), 'R3 autor do desfecho');
                check(r.code !== null, 'R2 código do desfecho');
              }
              if (action === 'acknowledge') {
                check(r.next.acknowledgedBy === actor.trim(), 'R3 autor do reconhecimento');
                check(r.next.status === 'acknowledged', 'destino do reconhecimento');
              }
              // Regra 4: reabertura limpa carimbos, nunca herda desfecho.
              if (action === 'reopen') {
                check(
                  r.next.status === 'open' && r.next.resolvedAt === null &&
                  r.next.resolvedBy === null && r.next.acknowledgedAt === null,
                  'R4 reabertura deve limpar carimbos',
                );
              }
              // Regra 7: entrada não mutada.
              check(snap.status === from && snap.updatedAt === 4000, 'R7 entrada mutada');
            }
          }
        }
      }
    }
  }
}

// ---- Regra 1/4: nenhuma cadeia leva a estado inválido (fuzz) --------------
let seed = 0x177;
const rnd = (n) => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed % n;
};
for (let run = 0; run < 4000; run += 1) {
  let snap = { status: 'open', updatedAt: 0 };
  let clock = 0;
  for (let step = 0; step < 40; step += 1) {
    const action = ACTIONS[rnd(ACTIONS.length)];
    clock += rnd(5) - 2; // relógio pode andar para trás (drift)
    const closing = action === 'resolve' || action === 'dismiss';
    const r = M.evaluateTreatment(snap, {
      action,
      actorId: 'op-' + rnd(3),
      note: 'motivo valido',
      code: closing ? M.allowedCodes(action)[rnd(M.allowedCodes(action).length)] : null,
      now: clock,
    });
    if (r.ok) {
      check(STATUSES.includes(r.next.status), 'fuzz: estado inválido');
      check(r.next.updatedAt >= snap.updatedAt, 'fuzz: relógio retrocedeu');
      check(LEGAL[snap.status].includes(action), 'fuzz: transição ilegal aceita');
      snap = r.next;
      clock = r.at;
    } else {
      check(!LEGAL[snap.status].includes(action) || r.reason !== 'illegal_transition',
        'fuzz: transição legal recusada como ilegal');
    }
  }
  // Só é possível encerrar depois de reconhecer (ou descartar direto).
  check(STATUSES.includes(snap.status), 'fuzz: estado final inválido');
}

// ---- Entradas hostis não podem lançar (regra 7) ---------------------------
const HOSTILE = [null, undefined, 42, 'open', {}, { status: 'zumbi' }, { status: null }];
for (const snap of HOSTILE) {
  for (const action of [...ACTIONS, null, undefined, 'drop table', 7]) {
    let threw = false;
    let res;
    try {
      res = M.evaluateTreatment(snap, { action, actorId: 'op', note: 'motivo', code: 'test', now: 1 });
    } catch {
      threw = true;
    }
    check(!threw, 'R7 lançou exceção com entrada hostil');
    check(res && res.ok === false && typeof res.message === 'string',
      'R7 recusa deve ser explicada');
  }
}

// ---- Rótulos e helpers cobertos ------------------------------------------
for (const code of M.RESOLUTION_CODES) {
  check(typeof M.resolutionCodeLabel(code) === 'string', 'rótulo de código');
  check(M.allowedCodes('resolve').includes(code) !== M.allowedCodes('dismiss').includes(code),
    'R6 código pertence a exatamente um desfecho');
  check(M.isNoiseOutcome(code) === M.allowedCodes('dismiss').includes(code),
    'R6 ruído = desfecho de descarte');
}
for (const s of STATUSES) {
  check(M.allowedActions(s).every((a) => LEGAL[s].includes(a)), 'allowedActions coerente');
  check(M.allowedActions(s).length === LEGAL[s].length, 'allowedActions completo');
  check(typeof M.alarmStatusLabel(s) === 'string', 'rótulo de estado');
}
check(M.allowedActions('zumbi').length === 0, 'estado desconhecido não oferece ação');
check(M.allowedActions(null).length === 0, 'estado nulo não oferece ação');

console.log(`Onda 177 — ${asserts.toLocaleString('pt-BR')} asserções, ${failures.length} falhas`);
if (failures.length > 0) {
  for (const f of [...new Set(failures)].slice(0, 20)) console.error(' ✗ ' + f);
  process.exit(1);
}
