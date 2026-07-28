/**
 * Onda 202 — Simulação da conferência por terceiro.
 *
 * A régua da onda combina fatos; o risco dela é semântico, não numérico. Por
 * isso a simulação não sorteia só entradas: ela sorteia ATAQUES e verifica que
 * o parecer resultante nunca comete um dos quatro erros abaixo.
 *
 *  S1. **Absolvição por indisponibilidade.** Cair a rede jamais pode produzir
 *      um parecer melhor do que consultar e não achar — nem pior.
 *  S2. **Condenação por ausência.** "Não consta" nunca pode aparecer com tom
 *      crítico nem afirmar integridade quebrada.
 *  S3. **Lavagem pelo registro.** Nenhuma combinação de registro transforma
 *      corrente quebrada em algo diferente de adulteração.
 *  S4. **Fusão de eixos.** `documentIntact` só depende da verificação;
 *      `originConfirmed` só depende do registro. Provado exaustivamente por
 *      produto cartesiano, não por amostragem.
 *
 * Além disso, a simulação percorre o produto cartesiano COMPLETO dos estados
 * (verificação × registro × veredito × divergência) porque o espaço é pequeno
 * o bastante para ser esgotado — e o que pode ser esgotado não deve ser
 * amostrado.
 */
import {
  conferAttestation,
  describeConferenceOutcome,
  severityRank,
  summarizeConferenceOutcome,
  worstOutcome,
  type ConferenceOutcome,
  type RegistryLookup,
} from '../src/lib/faces/attestationConference';
import type {
  AttestationVerdict,
  AttestationVerification,
  TimelineAttestation,
} from '../src/lib/faces/timelineAttestation';

let seed = 20260730;
const rnd = (): number => {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed / 0x7fffffff;
};
const pick = <T,>(xs: readonly T[]): T => xs[Math.floor(rnd() * xs.length)];

let assertions = 0;
const failures: string[] = [];
const check = (ok: boolean, msg: string): void => {
  assertions += 1;
  if (!ok && failures.length < 25) failures.push(msg);
};

const VERDICTS: readonly AttestationVerdict[] = [
  'corroborated',
  'partial',
  'contested',
  'inconclusive',
];

const ISSUED_AT = '2026-07-02T10:00:00.000Z';

function makeDoc(verdict: AttestationVerdict, issuedBy = 'user-a'): TimelineAttestation {
  return {
    format: 'visao.timeline.attestation',
    version: 1,
    algorithm: 'SHA-256',
    genesis: 'g',
    attestationId: 'att',
    subject: { personId: 'p1', label: null },
    window: { fromUtc: '2026-07-01T00:00:00.000Z', toUtc: '2026-07-02T00:00:00.000Z' },
    verdict,
    caveats: [],
    stats: {
      stays: 1,
      confirmedStays: 1,
      camerasVisited: 1,
      confirmedDwellMs: 10,
      openFloorMs: 0,
      excludedReadings: 0,
    },
    stays: [],
    transits: [],
    relatedExportRootHash: null,
    issuance: { issuedAtUtc: ISSUED_AT, issuedBy, sourceSystem: 'visao/201' },
    howToVerify: [],
    disclosure: 'd',
    chain: [],
    rootHash: 'a'.repeat(64),
  } as TimelineAttestation;
}

/* -------------------------------------------------------------------------- */
/*  Espaço de estados                                                          */
/* -------------------------------------------------------------------------- */

interface VerificationCase {
  readonly name: string;
  readonly broken: boolean;
  build: (declared: AttestationVerdict) => AttestationVerification;
}

const VERIFICATIONS: readonly VerificationCase[] = [
  {
    name: 'íntegro',
    broken: false,
    build: (v) => ({
      intact: true,
      firstBrokenIndex: null,
      rootMatches: true,
      verdictMatches: true,
      recomputedVerdict: v,
    }),
  },
  {
    name: 'elo quebrado',
    broken: true,
    build: (v) => ({
      intact: false,
      firstBrokenIndex: 2,
      rootMatches: true,
      verdictMatches: true,
      recomputedVerdict: v,
    }),
  },
  {
    name: 'selo não fecha',
    broken: true,
    build: (v) => ({
      intact: false,
      firstBrokenIndex: null,
      rootMatches: false,
      verdictMatches: true,
      recomputedVerdict: v,
    }),
  },
  {
    name: 'elo + selo',
    broken: true,
    build: (v) => ({
      intact: false,
      firstBrokenIndex: 0,
      rootMatches: false,
      verdictMatches: true,
      recomputedVerdict: v,
    }),
  },
  {
    name: 'veredito remontado',
    broken: true,
    build: (v) => ({
      intact: false,
      firstBrokenIndex: null,
      rootMatches: true,
      verdictMatches: false,
      recomputedVerdict: v === 'contested' ? 'corroborated' : 'contested',
    }),
  },
];

interface RegistryCase {
  readonly name: string;
  readonly kind: 'found' | 'absent' | 'unavailable';
  readonly diverges: boolean;
  build: (issuedBy: string) => RegistryLookup;
}

const REGISTRIES: readonly RegistryCase[] = [
  {
    name: 'consta e concorda',
    kind: 'found',
    diverges: false,
    build: (by) => ({ status: 'found', issuedAt: ISSUED_AT, issuedBy: by }),
  },
  {
    name: 'consta, mesmo instante em outro fuso',
    kind: 'found',
    diverges: false,
    build: (by) => ({ status: 'found', issuedAt: '2026-07-02T07:00:00-03:00', issuedBy: by }),
  },
  {
    name: 'consta sem autor',
    kind: 'found',
    diverges: false,
    build: () => ({ status: 'found', issuedAt: ISSUED_AT, issuedBy: null }),
  },
  {
    name: 'consta com data divergente',
    kind: 'found',
    diverges: true,
    build: (by) => ({ status: 'found', issuedAt: '2026-08-09T10:00:00.000Z', issuedBy: by }),
  },
  {
    name: 'consta com autor divergente',
    kind: 'found',
    diverges: true,
    build: () => ({ status: 'found', issuedAt: ISSUED_AT, issuedBy: 'outro-autor' }),
  },
  { name: 'não consta', kind: 'absent', diverges: false, build: () => ({ status: 'absent' }) },
  {
    name: 'indisponível',
    kind: 'unavailable',
    diverges: false,
    build: () => ({ status: 'unavailable', reason: 'falha de rede' }),
  },
];

/* -------------------------------------------------------------------------- */
/*  Fase 1 — produto cartesiano esgotado                                       */
/* -------------------------------------------------------------------------- */

const seen = new Set<ConferenceOutcome>();

for (const vcase of VERIFICATIONS) {
  for (const rcase of REGISTRIES) {
    for (const verdict of VERDICTS) {
      const attestation = makeDoc(verdict);
      const verification = vcase.build(verdict);
      const registry = rcase.build('user-a');
      const r = conferAttestation({ attestation, verification, registry });
      seen.add(r.outcome);
      const label = `${vcase.name} × ${rcase.name} × ${verdict}`;

      // S4 — eixos independentes.
      check(
        r.documentIntact ===
          (verification.rootMatches &&
            verification.firstBrokenIndex === null &&
            verification.verdictMatches),
        `S4 integridade acoplada ao registro: ${label}`,
      );
      check(
        r.originConfirmed === (registry.status === 'found'),
        `S4 procedência acoplada à integridade: ${label}`,
      );

      // I4 — o veredito do conteúdo é repassado sem retoque.
      check(r.documentVerdict === verdict, `I4 veredito do documento alterado: ${label}`);

      // S3 — lavagem pelo registro.
      if (vcase.name !== 'veredito remontado' && vcase.broken) {
        check(r.outcome === 'tampered', `S3 quebra virou ${r.outcome}: ${label}`);
        check(r.tone === 'critical', `S3 quebra sem tom crítico: ${label}`);
      }
      if (vcase.name === 'veredito remontado') {
        check(r.outcome === 'forged_verdict', `veredito remontado virou ${r.outcome}: ${label}`);
      }

      // S1/S2 — indisponível e ausente têm pareceres distintos e nenhum acusa.
      if (!vcase.broken) {
        if (rcase.kind === 'unavailable') {
          check(r.outcome === 'origin_unknown', `S1 indisponível virou ${r.outcome}: ${label}`);
          check(r.tone === 'neutral', `S1 indisponível com tom ${r.tone}: ${label}`);
        }
        if (rcase.kind === 'absent') {
          check(r.outcome === 'unregistered', `S2 ausente virou ${r.outcome}: ${label}`);
          check(r.tone !== 'critical', `S2 ausente com tom crítico: ${label}`);
          check(r.documentIntact, `S2 ausente negou integridade: ${label}`);
        }
        if (rcase.kind === 'found') {
          check(
            r.outcome === (rcase.diverges ? 'registry_divergence' : 'authentic'),
            `registro consta produziu ${r.outcome}: ${label}`,
          );
        }
      }

      // Contrato de apresentação.
      check(r.reasons.length > 0, `parecer sem motivos: ${label}`);
      check(
        describeConferenceOutcome(r.outcome).length > 0 &&
          summarizeConferenceOutcome(r.outcome).length > 0,
        `resultado sem texto: ${label}`,
      );
      check(severityRank(r.outcome) >= 0, `resultado fora da ordem: ${label}`);
      check(
        (r.tone === 'positive') === (r.outcome === 'authentic'),
        `tom positivo fora de autêntico: ${label}`,
      );
    }
  }
}

check(seen.size === 6, `nem todos os resultados foram alcançados: ${[...seen].join(',')}`);

/* -------------------------------------------------------------------------- */
/*  Fase 2 — monotonicidade: nenhum fato bom piora, nenhum fato ruim melhora   */
/* -------------------------------------------------------------------------- */

for (let i = 0; i < 4000; i += 1) {
  const verdict = pick(VERDICTS);
  const attestation = makeDoc(verdict);
  const vcase = pick(VERIFICATIONS);
  const verification = vcase.build(verdict);

  const okReg = conferAttestation({
    attestation,
    verification,
    registry: { status: 'found', issuedAt: ISSUED_AT, issuedBy: 'user-a' },
  });
  const absent = conferAttestation({ attestation, verification, registry: { status: 'absent' } });
  const down = conferAttestation({
    attestation,
    verification,
    registry: { status: 'unavailable', reason: 'r' },
  });

  // Constar e concordar nunca é pior do que não constar.
  check(
    severityRank(okReg.outcome) >= severityRank(absent.outcome),
    `confirmar origem piorou o parecer (${okReg.outcome} < ${absent.outcome})`,
  );
  // Indisponível fica ENTRE ausente e confirmado, nunca fora dessa faixa:
  // não pune quem só teve azar de rede, e não premia com procedência.
  check(
    severityRank(down.outcome) >= severityRank(absent.outcome) &&
      severityRank(down.outcome) <= severityRank(okReg.outcome),
    `indisponível fora da faixa: ${down.outcome}`,
  );
  // Indisponível jamais afirma procedência.
  check(!down.originConfirmed, 'indisponível afirmou procedência');
}

/* -------------------------------------------------------------------------- */
/*  Fase 3 — lote: o pior manda                                                */
/* -------------------------------------------------------------------------- */

const ALL: readonly ConferenceOutcome[] = [
  'tampered',
  'forged_verdict',
  'registry_divergence',
  'origin_unknown',
  'unregistered',
  'authentic',
];

for (let i = 0; i < 3000; i += 1) {
  const n = 1 + Math.floor(rnd() * 6);
  const batch: ConferenceOutcome[] = [];
  for (let k = 0; k < n; k += 1) batch.push(pick(ALL));
  const worst = worstOutcome(batch)!;
  check(
    batch.every((o) => severityRank(worst) <= severityRank(o)),
    `pior do lote incorreto: ${batch.join(',')} → ${worst}`,
  );
  // Acrescentar uma peça nunca melhora o lote.
  const grown = worstOutcome([...batch, pick(ALL)])!;
  check(
    severityRank(grown) <= severityRank(worst),
    `lote melhorou ao crescer: ${worst} → ${grown}`,
  );
}

/* -------------------------------------------------------------------------- */

if (failures.length > 0) {
  console.error(`\n❌ Onda 202 — ${failures.length} falha(s) em ${assertions} asserções:`);
  for (const f of failures) console.error(`   • ${f}`);
  process.exit(1);
}
console.log(`✅ Onda 202 — conferência por terceiro: ${assertions} asserções aprovadas.`);
console.log(`   Resultados alcançados: ${[...seen].sort().join(', ')}`);
