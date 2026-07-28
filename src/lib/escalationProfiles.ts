/**
 * Onda 238 — **Perfis de escalada por classe de fonte** e âncora na condição.
 *
 * ## Os dois defeitos que esta onda corrige
 *
 * A Onda 117 deu ao barramento de manutenção uma escada única
 * (`notified → reminder → escalated → paged`) calibrada para o que existia na
 * época: rotinas de expurgo e watchdogs que rodam de hora em hora. Para essas,
 * `30 / 120 / 360 min` é a régua certa — se um expurgo horário falhou e
 * ninguém reconheceu em seis horas, alguém precisa ser acordado.
 *
 * Desde então entraram no barramento fontes de **cadência diária** (Ondas 232,
 * 234 e 236: passivo de expurgo, órfão de conciliação e tendência do órfão).
 * Aplicar a mesma régua a elas produz dois erros simétricos, e os dois são
 * graves:
 *
 * **Defeito A — pager storm por fato lento.** A tendência é avaliada uma vez
 * por dia, às 03:55. O alerta nasce `critical`, e às 09:55 do mesmo dia a
 * escada genérica já o colocou em `paged`. Ninguém foi negligente: o operador
 * chegou às 08:00, viu um vazamento de contabilidade que se mede em *dias* e
 * decidiu (corretamente) tratá-lo no horário comercial. O sistema o pune por
 * isso. Canal crítico que grita por fato lento é canal que o time silencia — e
 * aí perdemos também os fatos rápidos.
 *
 * **Defeito B — o crônico que nunca escala.** Muito pior, e invisível. A
 * escada da Onda 117 mede a idade **da linha**, não a idade **da condição**.
 * As fontes de cadência diária reemitem: passado o cooldown, nasce uma linha
 * nova com `escalation_level = 0`. Um órfão que cresce há trinta dias produz
 * trinta linhas — cada uma jovem, cada uma abaixo do primeiro degrau quando o
 * cron de escalada passa, nenhuma delas jamais escalando. A condição mais
 * grave que o sistema sabe detectar é exatamente a que ele é incapaz de
 * escalar. O defeito A é barulhento e se corrige sozinho no dia seguinte; o
 * defeito B é silencioso e dura para sempre.
 *
 * ## Leis (O1–O10)
 *
 *  O1. O perfil é escolhido pela **classe da fonte** (prefixo da chave de
 *      rotina), nunca pelo texto livre nem pela severidade sozinha. Chave
 *      desconhecida cai no perfil `default` — que é, byte a byte, a régua da
 *      Onda 117. Esta onda não pode alterar o comportamento de nenhuma fonte
 *      que ela não tenha declarado explicitamente.
 *  O2. Nenhum degrau de fonte lenta é mais curto que **uma cadência** da
 *      própria fonte. Escalar mais rápido do que o fato pode mudar é pedir ao
 *      operador que reaja a uma informação que ainda não existe.
 *  O3. Para fontes **renováveis** (`anchorMode: 'streak'`) a idade é medida a
 *      partir da **âncora da condição** — a linha aberta mais antiga da mesma
 *      chave, sem reconhecimento posterior — e não da linha corrente. É a
 *      correção do defeito B.
 *  O4. Também o **nível** é herdado da sequência: uma linha nova de uma
 *      condição já escalonada nasce no nível da sequência. Sem isto a condição
 *      voltaria a `notified` a cada reemissão, e O3 daria a idade certa a um
 *      nível zerado — meio conserto é pior que nenhum, porque parece
 *      funcionar.
 *  O5. **Reconhecer quebra a sequência.** Reconhecida a condição, uma
 *      reemissão posterior é uma condição *nova*: âncora e nível recomeçam.
 *      Reconhecer significa "assumi este caso"; se a escada continuasse de
 *      onde parou, reconhecer nunca daria alívio e o operador pararia de
 *      reconhecer.
 *  O6. Teto por severidade é do perfil, e `warning` **nunca** chega ao plantão
 *      em nenhum perfil. Herança direta da Onda 117 (I5).
 *  O7. Monotonicidade e degrau único continuam valendo: nível nunca decresce,
 *      no máximo +1 por avaliação, respeitado o intervalo mínimo do perfil.
 *  O8. Envelhecer a condição nunca reduz o nível alvo, em nenhum perfil.
 *  O9. Relógio recuado (âncora no futuro) não escala.
 *  O10. O perfil aplicado é **declarado** no texto do alerta. Escada invisível
 *      é escada que ninguém audita — e foi exatamente assim que o defeito B
 *      sobreviveu a quatro ondas.
 *
 * Módulo **puro**. É a fonte da verdade espelhada por
 * `public.escalation_profile_for()` / `public.escalation_ladder_minutes()` e
 * conferida no CI por `scripts/check-escalation-profiles.ts`.
 */

import type { EscalationLevel, MaintenanceSeverity } from './maintenanceEscalation.ts';

const MINUTE = 1;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * Como a idade e o nível de partida são apurados.
 *
 * - `row`    — a linha é o incidente (watchdogs, despachos, falhas pontuais).
 * - `streak` — a linha é apenas a *última evidência* de uma condição que se
 *   reemite por cadência; o incidente é a sequência.
 */
export type EscalationAnchorMode = 'row' | 'streak';

export interface EscalationProfile {
  /** Identificador estável, gravado no detalhe do alerta e conferido no CI. */
  readonly id: string;
  /** Rótulo em português para a UI e para o texto do alerta (O10). */
  readonly label: string;
  /**
   * Idade mínima (min) por nível de DESTINO, indexada pelo nível.
   * A posição 0 nunca é lida — não existe "subir para 0".
   * `null` significa degrau inalcançável nesta severidade.
   */
  readonly ladderMinutes: Readonly<Record<MaintenanceSeverity, readonly (number | null)[]>>;
  readonly maxLevel: Readonly<Record<MaintenanceSeverity, EscalationLevel>>;
  readonly minStepMinutes: number;
  readonly undeliveredGraceMinutes: number;
  readonly anchorMode: EscalationAnchorMode;
  /**
   * Cadência declarada da fonte, em minutos. `null` para fontes contínuas.
   * Existe para que O2 seja **verificável**, não apenas prometida: o gate de
   * CI confere `ladder[1] >= cadence` em todo perfil que declara cadência.
   */
  readonly cadenceMinutes: number | null;
}

/**
 * Perfil histórico da Onda 117. Os números são intencionalmente idênticos aos
 * de `DEFAULT_ESCALATION_THRESHOLDS`; o gate de CI falha se divergirem, para
 * que esta onda jamais mude por acidente o comportamento das fontes antigas
 * (O1).
 */
export const OPERATIONAL_PROFILE: EscalationProfile = {
  id: 'operational',
  label: 'operacional (horária)',
  ladderMinutes: {
    critical: [null, 30, 120, 360],
    warning: [null, 240, 1440, null],
  },
  maxLevel: { critical: 3, warning: 2 },
  minStepMinutes: 30,
  undeliveredGraceMinutes: 75,
  anchorMode: 'row',
  cadenceMinutes: null,
};

/**
 * Fontes de contabilidade de cadência diária (Ondas 232 / 234 / 236).
 *
 * Escada em dias, não em horas: 1 dia para o repique, 3 dias para escalonar,
 * 7 dias para o plantão. Sete dias parece muito para um canal crítico — e
 * seria, para uma falha de rotina. Aqui significa: "esta condição sobreviveu a
 * sete ciclos completos de detecção, reemissão e leitura humana". Nesse ponto
 * não há mais dúvida de que ninguém está tratando, e o plantão é a resposta
 * certa. O caminho para chegar lá é a âncora da sequência (O3/O4); sem ela,
 * este perfil só teria corrigido o defeito A e agravado o B.
 */
export const SLOW_ACCOUNTING_PROFILE: EscalationProfile = {
  id: 'slow_accounting',
  label: 'contabilidade (diária)',
  ladderMinutes: {
    critical: [null, 1 * DAY, 3 * DAY, 7 * DAY],
    // `warning` diário nunca escalona: 14 dias apenas para o repique, e teto 2
    // é inalcançável na prática. Aviso lento que não muda é assunto de
    // planejamento, não de incidente.
    warning: [null, 14 * DAY, null, null],
  },
  maxLevel: { critical: 3, warning: 2 },
  // O2 — nenhum degrau mais rápido que uma cadência.
  minStepMinutes: 1 * DAY,
  // Despacho não entregue acelera (herança da Onda 117), mas o piso continua
  // sendo um ciclo do despachante somado à cadência da fonte: antes disso a
  // ausência de notificação ainda pode ser apenas atraso de fila.
  undeliveredGraceMinutes: 1 * DAY,
  anchorMode: 'streak',
  cadenceMinutes: 1 * DAY,
};

export const ESCALATION_PROFILES: readonly EscalationProfile[] = [
  OPERATIONAL_PROFILE,
  SLOW_ACCOUNTING_PROFILE,
];

/** Perfil aplicado quando a chave não casa com nenhum prefixo declarado. */
export const DEFAULT_ESCALATION_PROFILE = OPERATIONAL_PROFILE;

/**
 * Mapa prefixo → perfil. A ordem importa: a resolução usa o prefixo **mais
 * longo** que casa, para que um dia `admission_trend:critical_only` possa ser
 * declarado sem perturbar `admission_trend:`.
 */
export const ESCALATION_PROFILE_PREFIXES: ReadonlyArray<readonly [string, EscalationProfile]> = [
  ['admission_trend:', SLOW_ACCOUNTING_PROFILE],
  ['admission_reconcile:', SLOW_ACCOUNTING_PROFILE],
  ['admission_backlog:', SLOW_ACCOUNTING_PROFILE],
];

/**
 * O1 — resolve o perfil pela classe da fonte.
 *
 * Entrada não-string, vazia ou desconhecida devolve o perfil histórico. Este
 * módulo nunca é a causa de um alerta deixar de escalar.
 */
export function escalationProfileFor(routine: string | null | undefined): EscalationProfile {
  if (typeof routine !== 'string' || routine.length === 0) return DEFAULT_ESCALATION_PROFILE;
  let best: EscalationProfile = DEFAULT_ESCALATION_PROFILE;
  let bestLength = -1;
  for (const [prefix, profile] of ESCALATION_PROFILE_PREFIXES) {
    if (routine.startsWith(prefix) && prefix.length > bestLength) {
      best = profile;
      bestLength = prefix.length;
    }
  }
  return best;
}

/**
 * Âncora da condição, apurada pelo chamador (SQL ou simulador) a partir das
 * linhas abertas da mesma chave de rotina.
 *
 * `anchorAtMs` é o `created_at` da linha aberta mais antiga **posterior ao
 * último reconhecimento** (O5); `maxLevel` é o maior nível já alcançado dentro
 * dessa mesma sequência (O4).
 */
export interface ConditionStreak {
  readonly anchorAtMs: number;
  readonly maxLevel: EscalationLevel;
  /** Quantidade de linhas abertas na sequência — puramente informativa. */
  readonly rows: number;
}

/**
 * Constrói a âncora a partir das linhas de uma mesma chave.
 *
 * Regra de quebra (O5): qualquer linha reconhecida invalida como âncora
 * todas as linhas criadas **antes** do reconhecimento dela. Sobrevive como
 * âncora a linha aberta mais antiga criada depois do reconhecimento mais
 * recente.
 */
export function buildConditionStreak(
  rows: ReadonlyArray<{
    readonly createdAtMs: number;
    readonly acknowledgedAtMs: number | null;
    readonly escalationLevel: EscalationLevel;
  }>,
): ConditionStreak | null {
  let lastAckCreatedAt = Number.NEGATIVE_INFINITY;
  for (const row of rows) {
    if (row.acknowledgedAtMs !== null && row.createdAtMs > lastAckCreatedAt) {
      lastAckCreatedAt = row.createdAtMs;
    }
  }

  let anchorAtMs = Number.POSITIVE_INFINITY;
  let maxLevel = 0 as EscalationLevel;
  let count = 0;
  for (const row of rows) {
    if (row.acknowledgedAtMs !== null) continue;
    if (row.createdAtMs <= lastAckCreatedAt) continue; // O5
    count += 1;
    if (row.createdAtMs < anchorAtMs) anchorAtMs = row.createdAtMs;
    if (row.escalationLevel > maxLevel) maxLevel = row.escalationLevel;
  }

  if (count === 0) return null;
  return { anchorAtMs, maxLevel, rows: count };
}
