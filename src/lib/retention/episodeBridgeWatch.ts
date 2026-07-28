/**
 * Onda 185 — vigia da ponte de episódios travada.
 *
 * ## O defeito que esta onda corrige
 *
 * A Onda 184 decidiu, corretamente, que episódio de reincidência ainda aberto
 * NUNCA é apagado: seria destruir o denominador de um alarme em curso. Mas
 * essa decisão criou um ponto cego. Um episódio aberto há 90 dias quase nunca
 * é um alarme de 90 dias — é a ponte de episódios (Onda 181) que parou de
 * fechar, ou um agregador que morreu no meio. O expurgo passava por ele todo
 * dia, contava, e ninguém lia a contagem.
 *
 * Este módulo transforma essa contagem em veredito. Ele é a régua única,
 * espelhada literalmente por `public.evaluate_abandoned_episode_alerts()`.
 *
 * ## As quatro decisões difíceis
 *
 * **1. Contagem alta não é, por si só, defeito.** Um site grande com muitos
 * alarmes longos legítimos terá dezenas de episódios abertos. O que denuncia
 * ponte travada é o **crescimento sustentado**: a fila que só sobe, execução
 * após execução, porque nada fecha. O sinal é a derivada, não o valor.
 *
 * **2. Uma execução nunca é tendência.** Com menos de {@link MIN_SAMPLES}
 * amostras o veredito é `insufficient_data` — explicitamente "não sei", jamais
 * `healthy`. Chamar ignorância de saúde foi o erro que a Onda 183 já pagou no
 * painel de séries; não se repete aqui.
 *
 * **3. Encolher nunca alarma.** Se a última leitura é menor ou igual à
 * primeira da janela, a ponte está drenando — mesmo que o valor absoluto
 * ainda seja alto. Alarmar durante a recuperação treina o operador a ignorar
 * o alarme.
 *
 * **4. Há um teto que dispensa tendência.** Acima de
 * {@link ABSOLUTE_CRITICAL_FLOOR} episódios abandonados, a fila é grande
 * demais para se justificar por operação normal, e o veredito é crítico mesmo
 * sem crescimento — uma ponte travada há meses estabiliza num patamar alto e
 * pararia de "crescer", escapando da regra da derivada.
 */

/** Amostras mínimas para que exista tendência. Abaixo disso: "não sei". */
export const MIN_SAMPLES = 3;

/** Janela de observação da tendência, em horas. */
export const TREND_WINDOW_HOURS = 72;

/** Abaixo deste valor absoluto, crescimento é ruído operacional e é tolerado. */
export const NOISE_FLOOR = 3;

/** Crescimento (em episódios) na janela que caracteriza atenção. */
export const WARN_GROWTH = 5;

/** Crescimento na janela que caracteriza ponte travada. */
export const CRITICAL_GROWTH = 20;

/** Patamar absoluto que é crítico mesmo estável — ponte travada estabiliza. */
export const ABSOLUTE_CRITICAL_FLOOR = 100;

/** Uma leitura da trilha de expurgo. */
export interface AbandonedSample {
  /** Instante da execução, em ms. */
  readonly executedAt: number;
  /** Episódios abertos além do prazo naquela execução. */
  readonly abandonedOpen: number;
}

/** Veredito sobre a saúde da ponte de episódios. */
export type BridgeVerdict =
  | 'insufficient_data'
  | 'healthy'
  | 'tolerated'
  | 'draining'
  | 'growing'
  | 'stuck';

/** Avaliação completa, pronta para virar alerta de manutenção. */
export interface BridgeAssessment {
  readonly verdict: BridgeVerdict;
  /** Severidade no barramento de manutenção; `null` quando não se alarma. */
  readonly severity: 'warning' | 'critical' | null;
  /** Amostras consideradas dentro da janela. */
  readonly samples: number;
  /** Última contagem observada. */
  readonly latest: number;
  /** Primeira contagem da janela — a base da comparação. */
  readonly baseline: number;
  /** `latest - baseline`. Negativo significa drenagem. */
  readonly growth: number;
  /** Frase em português explicando o veredito. */
  readonly reason: string;
}

/** Ordena e recorta as amostras à janela, descartando leituras ilegíveis. */
function sanitize(samples: readonly AbandonedSample[], now: number): AbandonedSample[] {
  if (!Number.isFinite(now)) return [];
  const floor = now - TREND_WINDOW_HOURS * 3_600_000;
  return samples
    .filter(
      (s) =>
        Number.isFinite(s.executedAt) &&
        Number.isInteger(s.abandonedOpen) &&
        s.abandonedOpen >= 0 &&
        // Leitura no futuro é relógio errado, não informação: descartada em vez
        // de virar base de comparação e inverter o sinal da derivada.
        s.executedAt <= now &&
        s.executedAt >= floor,
    )
    .sort((a, b) => a.executedAt - b.executedAt);
}

/**
 * Avalia a saúde da ponte de episódios a partir da trilha de expurgo.
 *
 * A ordem dos testes é deliberada e não deve ser reordenada:
 * ignorância → saúde → teto absoluto → drenagem → crescimento → tolerância.
 * O teto vem antes da drenagem porque uma fila de 400 episódios que caiu para
 * 399 está drenando e continua sendo uma emergência.
 */
export function assessEpisodeBridge(
  samples: readonly AbandonedSample[],
  now: number,
): BridgeAssessment {
  const window = sanitize(samples, now);

  const first: AbandonedSample | undefined = window[0];
  const last: AbandonedSample | undefined = window[window.length - 1];

  if (window.length < MIN_SAMPLES || first === undefined || last === undefined) {
    return {
      verdict: 'insufficient_data',
      severity: null,
      samples: window.length,
      latest: last?.abandonedOpen ?? 0,
      baseline: first?.abandonedOpen ?? 0,
      growth: 0,
      reason: `Ponte de episódios: apenas ${window.length} execução(ões) nas últimas ${TREND_WINDOW_HOURS}h — amostra insuficiente para veredito.`,
    };
  }

  const baseline = first.abandonedOpen;
  const latest = last.abandonedOpen;
  const growth = latest - baseline;
  const base = {
    samples: window.length,
    latest,
    baseline,
    growth,
  };

  if (latest === 0) {
    return {
      ...base,
      verdict: 'healthy',
      severity: null,
      reason: 'Ponte de episódios: nenhum episódio aberto além do prazo.',
    };
  }

  if (latest >= ABSOLUTE_CRITICAL_FLOOR) {
    return {
      ...base,
      verdict: 'stuck',
      severity: 'critical',
      reason: `Ponte de episódios travada: ${latest} episódios abertos além do prazo (patamar absoluto ≥ ${ABSOLUTE_CRITICAL_FLOOR}).`,
    };
  }

  if (growth <= 0) {
    return {
      ...base,
      verdict: 'draining',
      severity: null,
      reason: `Ponte de episódios: ${latest} episódio(s) abandonado(s), sem crescimento nas últimas ${TREND_WINDOW_HOURS}h (base ${baseline}).`,
    };
  }

  if (latest < NOISE_FLOOR) {
    return {
      ...base,
      verdict: 'tolerated',
      severity: null,
      reason: `Ponte de episódios: ${latest} episódio(s) abandonado(s) — abaixo do piso de ruído (${NOISE_FLOOR}).`,
    };
  }

  if (growth >= CRITICAL_GROWTH) {
    return {
      ...base,
      verdict: 'stuck',
      severity: 'critical',
      reason: `Ponte de episódios travada: +${growth} episódios abandonados em ${TREND_WINDOW_HOURS}h (de ${baseline} para ${latest}) — episódios não estão sendo fechados.`,
    };
  }

  if (growth >= WARN_GROWTH) {
    return {
      ...base,
      verdict: 'growing',
      severity: 'warning',
      reason: `Ponte de episódios acumulando: +${growth} episódios abandonados em ${TREND_WINDOW_HOURS}h (de ${baseline} para ${latest}).`,
    };
  }

  return {
    ...base,
    verdict: 'tolerated',
    severity: null,
    reason: `Ponte de episódios: +${growth} episódio(s) abandonado(s) em ${TREND_WINDOW_HOURS}h — variação dentro do tolerado.`,
  };
}
