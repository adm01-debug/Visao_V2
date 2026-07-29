/**
 * Onda 247 — Fan-in da mudez do despachante para o barramento de manutenção.
 *
 * ## O defeito que esta onda corrige
 *
 * A Onda 246 tornou a mudez **visível**: `maintenance_dispatch_runs` prova que
 * o despachante rodou e não entregou nada, e o cartão do console publica o
 * veredito. Mas visível não é supervisionado. A prova de entrega mora numa
 * tela que alguém precisa abrir — e a classe de operador que abre o console de
 * manutenção por precaução é a mesma que já desconfiava. O defeito continuava
 * dependendo de sorte.
 *
 * Esta régua leva o veredito de entregabilidade ao barramento de manutenção,
 * onde ele herda reconhecimento, escalada e retenção como qualquer outra
 * fonte.
 *
 * ## A circularidade, declarada em vez de escondida
 *
 * Existe um paradoxo estrutural aqui, e ele é o coração desta onda: **o aviso
 * de que o despachante está mudo não pode ser entregue pelo despachante
 * mudo.** Emitir o alerta no barramento e deixá-lo seguir o fluxo normal
 * produziria a mesma ilusão que a Onda 246 desmontou — a escada avançaria,
 * `maintenance_alert_events` diria "escalonado", e ninguém seria chamado.
 *
 * A saída honesta não é técnica, é epistemológica: quando a entrega está
 * comprometida (`muted` ou `failing`), o alerta viaja marcado como
 * **auto-referente** (`self_referential: true`) e a frase diz, em português
 * claro, que este aviso específico não sairá por canal externo e depende de
 * leitura no console. Um alerta que mente sobre a própria entregabilidade é
 * pior que nenhum alerta, porque consome a confiança que sustenta todos os
 * outros.
 *
 * ## Leis (W1–W10)
 *
 *  W1. A severidade é **derivada** da saúde de entrega. Nenhum chamador
 *      informa, eleva ou rebaixa severidade.
 *  W2. `muted` (nenhum canal configurado) com crítico aberto é `critical`;
 *      sem crítico aberto é `warning`. O pager desligado é defeito nos dois
 *      casos — a diferença é se alguém já está esperando ser chamado.
 *  W3. `failing` (havia canal, planejou envio, nada saiu) é **sempre**
 *      `critical`, inclusive sem crítico aberto: um canal que existe e não
 *      entrega é pior que um canal ausente, porque parece configurado.
 *  W4. `degraded` (parte saiu) é `warning`. Entrega parcial é degradação, não
 *      apagão; tratá-la como crítica gastaria a atenção reservada ao apagão.
 *  W5. `unknown` (nenhuma execução legível registrada) nunca é silêncio.
 *      É `warning` por padrão e `critical` quando há crítico aberto:
 *      ignorância com gente esperando é indistinguível de apagão.
 *  W6. `unreadable` (contabilidade da execução não fecha) é `warning` e nunca
 *      `critical`: a culpa provável é nossa, do registro, e acusar o canal
 *      por um defeito de escrituração desloca a investigação para o lugar
 *      errado. Mas nunca é `ok` — livro que não fecha não atesta entrega.
 *  W7. `delivering` e `idle` não emitem. Silêncio aqui é o estado saudável, e
 *      "não emitiu" jamais é apresentado como "entrega conferida".
 *  W8. O cooldown deriva da cadência do despachante, entre piso e teto; o
 *      crítico usa metade da cadência, para reaparecer antes do esquecimento.
 *  W9. Quando a entrega está comprometida, o alerta é **auto-referente** e
 *      diz isso na frase. Jamais afirmamos que este aviso foi notificado.
 *  W10. A frase carrega sempre os números que sustentam a acusação: minutos
 *      desde a última execução, canais configurados e críticos não avisados.
 *      Acusação sem número não é auditável.
 *
 * Módulo **puro**: não conhece banco, React nem relógio global. É a fonte da
 * verdade espelhada por `public.deliverability_alert_severity()` /
 * `public.evaluate_deliverability_alerts()`.
 */

import type {
  DeliverabilityVerdict,
  DispatchDelivery,
} from './dispatchDeliverability.ts';
import { DISPATCH_CADENCE_MINUTES } from './dispatchDeliverability.ts';

/** Severidade aceita pelo barramento de manutenção. */
export type DeliverabilityAlertSeverity = 'warning' | 'critical';

/** W-chave — prefixo estável, nunca colide com outros fan-ins. */
export const DELIVERABILITY_PREFIX = 'dispatch_deliverability:';

/** Job supervisionado por esta régua. */
export const DELIVERABILITY_JOB = 'maintenance_alerts_dispatch';

/** Piso e teto do cooldown, em minutos. */
export const COOLDOWN_FLOOR_MINUTES = 60;
export const COOLDOWN_CEILING_MINUTES = 1440;

/** Estados de entrega em que o próprio aviso não sai por canal externo (W9). */
const COMPROMISED: ReadonlySet<DispatchDelivery> = new Set<DispatchDelivery>([
  'muted',
  'failing',
  'unknown',
  'unreadable',
]);

/** Chave estável e prefixada da rotina. */
export function deliverabilityRoutineKey(job: string = DELIVERABILITY_JOB): string {
  return `${DELIVERABILITY_PREFIX}${job}`;
}

/**
 * W1–W7 — severidade derivada do eixo de entrega. `null` significa "não
 * emite". `unnotifiedCritical` só agrava; jamais atenua.
 */
export function deliverabilityAlertSeverity(
  delivery: DispatchDelivery,
  unnotifiedCritical: number,
): DeliverabilityAlertSeverity | null {
  // Contagem negativa ou não finita é tratada como zero: um número corrompido
  // nunca deve poder *reduzir* a gravidade, mas também não pode inventá-la.
  const waiting =
    Number.isFinite(unnotifiedCritical) && unnotifiedCritical > 0 ? unnotifiedCritical : 0;

  switch (delivery) {
    case 'muted':
      return waiting > 0 ? 'critical' : 'warning'; // W2
    case 'failing':
      return 'critical'; // W3
    case 'degraded':
      return 'warning'; // W4
    case 'unknown':
      return waiting > 0 ? 'critical' : 'warning'; // W5
    case 'unreadable':
      return 'warning'; // W6
    case 'delivering':
    case 'idle':
      return null; // W7
    default:
      // Estado desconhecido para esta régua é cegueira, não saúde.
      return 'warning';
  }
}

/** W8 — cooldown derivado da cadência, sempre entre piso e teto. */
export function deliverabilityCooldownMinutes(
  cadenceMinutes: number,
  severity: DeliverabilityAlertSeverity,
): number {
  if (!Number.isFinite(cadenceMinutes) || cadenceMinutes <= 0) {
    throw new RangeError(`cadência inválida para cooldown: ${cadenceMinutes}`);
  }
  const base =
    severity === 'critical' ? Math.round(cadenceMinutes / 2) : Math.round(cadenceMinutes);
  return Math.min(COOLDOWN_CEILING_MINUTES, Math.max(COOLDOWN_FLOOR_MINUTES, base));
}

/** Alerta candidato a ser gravado no barramento de manutenção. */
export interface DeliverabilityAlert {
  readonly routine: string;
  readonly severity: DeliverabilityAlertSeverity;
  readonly delivery: DispatchDelivery;
  readonly reason: string;
  readonly cooldownMinutes: number;
  /** W9 — este aviso sairá por canal externo? */
  readonly selfReferential: boolean;
  readonly detail: {
    readonly job_name: string;
    readonly delivery: DispatchDelivery;
    readonly punctuality: string;
    readonly health: string;
    readonly minutes_since_run: number | null;
    readonly last_run_at: string | null;
    readonly channels: readonly string[];
    readonly unnotified_critical: number;
    readonly self_referential: boolean;
    readonly cadence_minutes: number;
    readonly cooldown_minutes: number;
  };
}

export interface BuildDeliverabilityAlertOptions {
  readonly cadenceMinutes?: number;
  readonly job?: string;
  readonly label?: string;
}

const DEFAULT_LABEL = 'Despacho externo de manutenção';

/** Sufixo de honestidade — só aparece quando é verdade (W9). */
const SELF_REF_NOTE =
  ' — ATENÇÃO: este aviso não sai por canal externo (o canal é justamente o que falhou) ' +
  'e só será visto no console de manutenção';

function ageFragment(minutes: number | null): string {
  if (minutes === null) return 'sem execução registrada';
  if (minutes < 90) return `última execução há ${Math.round(minutes)} min`;
  const hours = minutes / 60;
  if (hours < 48) return `última execução há ${hours.toFixed(1)} h`;
  return `última execução há ${(hours / 24).toFixed(1)} dia(s)`;
}

function channelFragment(channels: readonly string[]): string {
  return channels.length === 0 ? 'nenhum canal configurado' : `canais: ${channels.join(', ')}`;
}

/** W10 — redige em PT-BR sempre com os números que sustentam a acusação. */
function renderReason(
  label: string,
  verdict: DeliverabilityVerdict,
  cadence: number,
  selfReferential: boolean,
): string {
  // Contagem corrompida nunca chega ao plantonista: "NaN crítico(s) sem aviso"
  // destrói a credibilidade da frase inteira e não é auditável. Normalizamos
  // aqui, na mesma regra usada pela severidade, para que texto e veredito
  // jamais divirjam.
  const waiting =
    Number.isFinite(verdict.unnotifiedCritical) && verdict.unnotifiedCritical > 0
      ? verdict.unnotifiedCritical
      : 0;
  const numbers =
    `${ageFragment(verdict.minutesSinceRun)}, ${channelFragment(verdict.channels)}, ` +
    `${waiting} crítico(s) sem aviso, cadência ${cadence} min`;

  let head: string;
  switch (verdict.delivery) {
    case 'muted':
      head = `${label}: despachante mudo — nenhum canal externo configurado`;
      break;
    case 'failing':
      head = `${label}: nenhum envio saiu apesar de canal configurado`;
      break;
    case 'degraded':
      head = `${label}: entrega parcial — parte dos envios falhou`;
      break;
    case 'unknown':
      head = `${label}: nenhuma execução legível registrada — entrega não comprovada`;
      break;
    case 'unreadable':
      head = `${label}: contabilidade da execução não fecha — entrega não atestável`;
      break;
    default:
      head = `${label}: estado de entrega '${verdict.delivery}' não reconhecido`;
  }

  return `${head} (${numbers})${selfReferential ? SELF_REF_NOTE : ''}`;
}

/**
 * Converte o veredito de entregabilidade (Onda 246) em alerta de manutenção.
 * Retorna `null` quando a entrega está saudável ou ociosa (W7). Nunca lança,
 * exceto quando a cadência informada é inválida (W8).
 */
export function buildDeliverabilityAlert(
  verdict: DeliverabilityVerdict | null | undefined,
  options: BuildDeliverabilityAlertOptions = {},
): DeliverabilityAlert | null {
  if (!verdict) return null;

  const severity = deliverabilityAlertSeverity(verdict.delivery, verdict.unnotifiedCritical);
  if (severity === null) return null;

  const cadence =
    typeof options.cadenceMinutes === 'number' && Number.isFinite(options.cadenceMinutes)
      ? options.cadenceMinutes
      : DISPATCH_CADENCE_MINUTES;
  const cooldown = deliverabilityCooldownMinutes(cadence, severity);
  const job = options.job ?? DELIVERABILITY_JOB;
  const label = options.label ?? DEFAULT_LABEL;
  const selfReferential = COMPROMISED.has(verdict.delivery);
  const rounded = Math.round(cadence);

  return {
    routine: deliverabilityRoutineKey(job),
    severity,
    delivery: verdict.delivery,
    reason: renderReason(label, verdict, rounded, selfReferential),
    cooldownMinutes: cooldown,
    selfReferential,
    detail: {
      job_name: job,
      delivery: verdict.delivery,
      punctuality: verdict.punctuality,
      health: verdict.health,
      minutes_since_run:
        verdict.minutesSinceRun === null ? null : Math.round(verdict.minutesSinceRun),
      last_run_at: verdict.lastRunAt,
      channels: [...verdict.channels],
      unnotified_critical:
        Number.isFinite(verdict.unnotifiedCritical) && verdict.unnotifiedCritical > 0
          ? verdict.unnotifiedCritical
          : 0,
      self_referential: selfReferential,
      cadence_minutes: rounded,
      cooldown_minutes: cooldown,
    },
  };
}
