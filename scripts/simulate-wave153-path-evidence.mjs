#!/usr/bin/env node
/**
 * Onda 153 — Simulação da evidência por caminho de conectividade.
 *
 * O que está sendo provado: a agregação que o BANCO faz (modelo `aggregate`,
 * espelho fiel do SQL `connectivity_path_evidence`) produz exatamente a mesma
 * evidência que a redução incremental `applyAttempt` da Onda 152 produziria se
 * tivéssemos acompanhado cada tentativa ao vivo.
 *
 * Por que isso importa: se as duas divergirem, o operador vê uma quarentena que
 * o motor de failover não enxerga (ou o contrário) — e nenhum diagnóstico de
 * rota é confiável. É a classe de bug mais cara desta família, porque some nos
 * testes de caminho feliz e só aparece com histórico longo e sujo.
 *
 * Invariantes verificadas:
 *  E1  attempts ≥ successes ≥ 0 e nenhum contador negativo.
 *  E2  consecutiveTransportFailures = falhas de transporte após o último
 *      sucesso — nunca conta nada anterior ao sucesso.
 *  E3  Falha não-transporte jamais incrementa o contador de quarentena.
 *  E4  lastFailureKind é a classe da linha MAIS RECENTE.
 *  E5  Paridade total com a redução `applyAttempt`.
 *  E6  Determinismo: reordenar a leitura (mesma ordem cronológica) não muda
 *      o resultado.
 *  E7  Linhas com desfecho desconhecido e caminho `cancelled` são ignoradas —
 *      não viram amostra nem culpa.
 */

const PATHS = ['direct', 'port_forward', 'vpn', 'relay'];

/** Espelho JS da tabela `connectivity_failure_kind` do SQL / do TypeScript. */
export const CODE_KINDS = {
  transport: [
    'timeout',
    'connect_timeout',
    'read_timeout',
    'reset',
    'refused',
    'connection_refused',
    'network_unreachable',
    'host_unreachable',
    'protocol',
    'relay_unavailable',
    'relay_timeout',
    'tunnel_down',
    'agent_offline',
  ],
  auth: [
    'unauthorized',
    'forbidden',
    'invalid_credentials',
    'auth_failed',
    'credentials_missing',
    'kek_not_configured',
  ],
  config: [
    'private_host_blocked',
    'dns',
    'dns_failure',
    'tls',
    'tls_handshake_failed',
    'redirect_loop',
    'invalid_url',
    'invalid_host',
    'no_onvif_endpoint',
    'missing_endpoint',
    'unsupported_scheme',
  ],
  device: [
    'device_busy',
    'no_stream',
    'stream_unavailable',
    'camera_offline',
    'unsupported_profile',
    'ptz_not_supported',
  ],
  none: ['aborted', 'cancelled', 'none', 'ok'],
};

export function classify(code) {
  if (typeof code !== 'string') return 'none';
  const c = code.trim().toLowerCase();
  if (c === '') return 'none';
  for (const [kind, codes] of Object.entries(CODE_KINDS)) {
    if (codes.includes(c)) return kind;
  }
  return 'config'; // desconhecido é neutro (T1)
}

/**
 * Espelho do SQL: recebe as linhas do MAIS RECENTE para o mais antigo e devolve
 * a evidência do caminho.
 */
export function aggregate(rowsNewestFirst) {
  const usable = rowsNewestFirst.filter((r) => r.succeeded !== null && r.path !== 'cancelled');
  const attempts = usable.length;
  const successes = usable.filter((r) => r.succeeded).length;
  const okIndex = usable.findIndex((r) => r.succeeded);
  const limit = okIndex === -1 ? usable.length : okIndex;
  let consecutive = 0;
  for (let i = 0; i < limit; i += 1) {
    if (classify(usable[i].code) === 'transport') consecutive += 1;
  }
  const lastTransport = usable.find((r) => !r.succeeded && classify(r.code) === 'transport');
  const first = usable[0];
  return {
    attempts,
    successes,
    consecutiveTransportFailures: consecutive,
    lastTransportFailureAtMs: lastTransport ? lastTransport.at : null,
    lastFailureKind: first ? (first.succeeded ? 'none' : classify(first.code)) : 'none',
  };
}

/** Redução incremental de referência (semântica de `applyAttempt`, Onda 152). */
export function reduceLive(rowsOldestFirst) {
  let ev = {
    attempts: 0,
    successes: 0,
    consecutiveTransportFailures: 0,
    lastTransportFailureAtMs: null,
    lastFailureKind: 'none',
  };
  for (const r of rowsOldestFirst) {
    if (r.succeeded === null || r.path === 'cancelled') continue;
    if (r.succeeded) {
      ev = {
        attempts: ev.attempts + 1,
        successes: ev.successes + 1,
        consecutiveTransportFailures: 0,
        lastTransportFailureAtMs: ev.lastTransportFailureAtMs,
        lastFailureKind: 'none',
      };
      continue;
    }
    const kind = classify(r.code);
    ev = {
      attempts: ev.attempts + 1,
      successes: ev.successes,
      consecutiveTransportFailures:
        kind === 'transport'
          ? ev.consecutiveTransportFailures + 1
          : ev.consecutiveTransportFailures,
      lastTransportFailureAtMs: kind === 'transport' ? r.at : ev.lastTransportFailureAtMs,
      lastFailureKind: kind,
    };
  }
  return ev;
}

/* ---------------- gerador determinístico ---------------- */
let seed = 153_153;
function rnd() {
  seed = (seed * 1_103_515_245 + 12_345) % 2_147_483_648;
  return seed / 2_147_483_648;
}
function pick(list) {
  return list[Math.floor(rnd() * list.length) % list.length];
}

const ALL_CODES = [...Object.values(CODE_KINDS).flat(), 'codigo_que_ninguem_mapeou', '', null];

export function run() {
  const failures = [];
  let scenarios = 0;

  for (let i = 0; i < 4000; i += 1) {
    const length = Math.floor(rnd() * 24);
    const rows = [];
    let t = 1_700_000_000_000;
    for (let j = 0; j < length; j += 1) {
      t += 1_000 + Math.floor(rnd() * 600_000);
      const roll = rnd();
      rows.push({
        at: t,
        path: roll < 0.06 ? 'cancelled' : pick(PATHS),
        succeeded: roll < 0.06 ? false : roll < 0.16 ? null : rnd() < 0.4,
        code: pick(ALL_CODES),
      });
    }
    scenarios += 1;

    const oldestFirst = rows;
    const newestFirst = [...rows].reverse();

    const agg = aggregate(newestFirst);
    const live = reduceLive(oldestFirst);

    // E1
    if (agg.attempts < agg.successes || agg.successes < 0 || agg.consecutiveTransportFailures < 0) {
      failures.push(`E1 violada no cenário ${i}`);
    }
    // E5 (engloba E2/E3/E4 por construção da redução de referência)
    for (const key of Object.keys(live)) {
      if (agg[key] !== live[key]) {
        failures.push(`E5 violada no cenário ${i}: ${key} agregado=${agg[key]} vivo=${live[key]}`);
      }
    }
    // E6
    const again = aggregate([...newestFirst]);
    if (JSON.stringify(again) !== JSON.stringify(agg)) {
      failures.push(`E6 violada no cenário ${i}`);
    }
    // E7
    const usable = rows.filter((r) => r.succeeded !== null && r.path !== 'cancelled');
    if (agg.attempts !== usable.length) failures.push(`E7 violada no cenário ${i}`);
  }

  // E2/E3 dirigidos: falha neutra depois de transporte não muda o contador.
  for (const neutral of ['unauthorized', 'private_host_blocked', 'camera_offline', 'lixo']) {
    scenarios += 1;
    const base = [
      { at: 1, path: 'vpn', succeeded: false, code: 'timeout' },
      { at: 2, path: 'vpn', succeeded: false, code: 'reset' },
      { at: 3, path: 'vpn', succeeded: false, code: neutral },
    ];
    const ev = aggregate([...base].reverse());
    if (ev.consecutiveTransportFailures !== 2) {
      failures.push(
        `E3 violada com código neutro "${neutral}": ${ev.consecutiveTransportFailures}`
      );
    }
    if (ev.lastFailureKind === 'transport') {
      failures.push(`E4 violada com código neutro "${neutral}"`);
    }
  }

  // E2 dirigido: sucesso zera o histórico anterior.
  scenarios += 1;
  const withOk = aggregate(
    [
      { at: 1, path: 'relay', succeeded: false, code: 'timeout' },
      { at: 2, path: 'relay', succeeded: false, code: 'timeout' },
      { at: 3, path: 'relay', succeeded: true, code: null },
      { at: 4, path: 'relay', succeeded: false, code: 'timeout' },
    ].reverse()
  );
  if (withOk.consecutiveTransportFailures !== 1) {
    failures.push(`E2 violada: esperado 1, obtido ${withOk.consecutiveTransportFailures}`);
  }

  return { scenarios, failures };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { scenarios, failures } = run();
  console.log('Onda 153 — simulação da evidência por caminho');
  console.log(`  cenários  : ${scenarios}`);
  console.log(`  violações : ${failures.length}`);
  for (const f of failures.slice(0, 20)) console.log(`    - ${f}`);
  process.exitCode = failures.length === 0 ? 0 : 1;
}
