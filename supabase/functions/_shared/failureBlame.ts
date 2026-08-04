/**
 * Onda 146 — Regra única de ATRIBUIÇÃO DE CULPA para falhas de Edge Function.
 *
 * A Onda 145 fechou o vocabulário de *como* a rede falhou (`NetworkErrorKind`).
 * Falta a pergunta que o operador realmente faz às 3h da manhã: **de quem é a
 * culpa?** Sem isso, o alerta de manutenção trata "câmera muda" e "rede
 * quebrada" como o mesmo evento — e o técnico é despachado para o lugar errado.
 *
 * Este módulo NÃO faz I/O e NÃO lança. É uma função total: qualquer entrada,
 * inclusive lixo, produz um valor do vocabulário fechado abaixo.
 *
 * Princípio de projeto: a mesma classe de rede significa coisas diferentes
 * dependendo de ONDE o código rodou. Um `timeout` visto da nuvem pode ser
 * firewall, NAT, link caído ou a câmera desligada — não dá para acusar o
 * dispositivo. O MESMO `timeout` visto de um agente dentro da LAN já esgotou as
 * hipóteses de transporte: sobrou o dispositivo. Ignorar `run_from` é a origem
 * do diagnóstico injusto.
 */

import type { NetworkErrorKind } from './networkError.ts';

/** Onde o código que sofreu a falha executou. Espelha `run_from` na auditoria. */
export type RunFrom = 'cloud' | 'relay' | 'agent' | 'client';

/**
 * Vocabulário fechado de responsáveis. Cada valor mapeia para uma AÇÃO humana
 * distinta — é esse o critério para um valor existir.
 */
export type FailureBlame =
  /** O equipamento na ponta (câmera/NVR) não respondeu ou respondeu errado. → técnico em campo. */
  | 'device'
  /** O caminho de rede entre nós e o equipamento falhou. → operador de rede/link. */
  | 'transport'
  /** Configuração nossa ou do cliente: DNS, credencial, endpoint, host bloqueado. → ajuste no cadastro. */
  | 'config'
  /** Quem chamou desistiu (navegador fechou, deploy derrubou a função). → nenhuma ação. */
  | 'caller'
  /** Dependência da nuvem (banco, RPC, storage) falhou. → escalar para a plataforma. */
  | 'cloud'
  /** Não classificável. Existe para virar alerta, nunca silêncio. */
  | 'unknown';

export interface BlameInput {
  /** Classe de falha de transporte, quando houve falha de transporte. */
  kind?: NetworkErrorKind | null;
  /** Onde o código rodou. Ausente = tratado como `cloud` (pior caso conhecido). */
  runFrom?: RunFrom | null;
  /**
   * Status HTTP recebido DO UPSTREAM (câmera/NVR/API externa) — não o status
   * que nós devolvemos ao cliente. Presente ⇒ o transporte funcionou.
   */
  upstreamStatus?: number | null;
  /**
   * `true` quando a falha veio de uma dependência da própria nuvem (RPC do
   * banco, storage, fila). Tem precedência sobre a leitura de rede.
   */
  cloudDependency?: boolean;
}

/** Ordem de precedência das regras. Exportada para a simulação auditar cobertura. */
export type BlameRule =
  | 'R0_caller_aborted'
  | 'R1_cloud_dependency'
  | 'R2_upstream_responded'
  | 'R3_name_resolution'
  | 'R4_local_reach_proven'
  | 'R5_remote_path_opaque'
  | 'R6_deterministic_peer'
  | 'R7_unknown';

export interface BlameVerdict {
  blame: FailureBlame;
  rule: BlameRule;
  /** Explicação curta, em português, pronta para a trilha exibida na UI. */
  reason: string;
}

const RUN_FROM_VALUES: ReadonlySet<string> = new Set(['cloud', 'relay', 'agent', 'client']);

/**
 * `agent` e `relay` significam que a tentativa foi EXECUTADA dentro da rede das
 * câmeras — o veredito veio de lá. Se de dentro da LAN o equipamento não
 * respondeu, as hipóteses de transporte de longa distância já caíram.
 *
 * Importante: quando é o TÚNEL que falha (a nuvem não alcança o agente), a
 * falha é registrada com `run_from: "cloud"`, porque quem sofreu foi o lado da
 * nuvem. Por isso `relay` aqui nunca mascara um túnel caído.
 */
function isLocalReachProven(runFrom: RunFrom): boolean {
  return runFrom === 'agent' || runFrom === 'relay';
}

function normalizeRunFrom(value: unknown): RunFrom {
  return typeof value === 'string' && RUN_FROM_VALUES.has(value) ? (value as RunFrom) : 'cloud';
}

function isValidHttpStatus(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 100 && value <= 599;
}

/**
 * Decide o responsável por uma falha. Função total: nunca lança, sempre devolve
 * um valor do vocabulário. As regras são avaliadas na ordem declarada em
 * `BlameRule` e a primeira que casa vence.
 */
export function deriveBlame(input: BlameInput): BlameVerdict {
  const runFrom = normalizeRunFrom(input?.runFrom);
  const kind = (input?.kind ?? null) as NetworkErrorKind | null;

  // R0 — cancelamento do chamador nunca acusa terceiros, venha de onde vier.
  if (kind === 'aborted') {
    return {
      blame: 'caller',
      rule: 'R0_caller_aborted',
      reason: 'Quem chamou cancelou antes da resposta; nenhum equipamento foi acusado.',
    };
  }

  // R1 — falha de dependência da nuvem tem precedência sobre leitura de rede.
  if (input?.cloudDependency === true) {
    return {
      blame: 'cloud',
      rule: 'R1_cloud_dependency',
      reason: 'A falha veio de uma dependência da nuvem (banco/RPC/armazenamento).',
    };
  }

  // R2 — houve resposta HTTP do upstream: o transporte, por definição, funcionou.
  if (kind === null && isValidHttpStatus(input?.upstreamStatus)) {
    const status = input.upstreamStatus as number;
    if (status >= 500) {
      return {
        blame: 'device',
        rule: 'R2_upstream_responded',
        reason: `O equipamento respondeu ${status}: falha interna dele, não do caminho de rede.`,
      };
    }
    if (status === 401 || status === 403) {
      return {
        blame: 'config',
        rule: 'R2_upstream_responded',
        reason: `O equipamento respondeu ${status}: credencial ou permissão cadastrada está errada.`,
      };
    }
    return {
      blame: 'device',
      rule: 'R2_upstream_responded',
      reason: `O equipamento respondeu ${status}: o transporte funcionou.`,
    };
  }

  if (kind === null) {
    return {
      blame: 'unknown',
      rule: 'R7_unknown',
      reason: 'Sem classe de rede e sem resposta do upstream: não há base para atribuir culpa.',
    };
  }

  // R3 — resolução de nome é cadastro, não equipamento.
  if (kind === 'dns') {
    return {
      blame: 'config',
      rule: 'R3_name_resolution',
      reason: 'O nome do host não resolveu: endereço cadastrado ou DNS da rede está errado.',
    };
  }

  // R6 — falhas determinísticas provam que ALGUÉM atendeu e negou/quebrou o diálogo.
  if (kind === 'tls' || kind === 'protocol' || kind === 'redirect_loop') {
    return {
      blame: 'device',
      rule: 'R6_deterministic_peer',
      reason:
        'Houve diálogo com a ponta, mas ela falou errado (TLS/HTTP inválido ou redirecionamento circular).',
    };
  }

  // R4 — de dentro da LAN, transporte já foi descartado: sobra o equipamento.
  if (isLocalReachProven(runFrom)) {
    if (kind === 'refused') {
      return {
        blame: 'config',
        rule: 'R4_local_reach_proven',
        reason:
          'O agente alcançou o host na LAN e a porta recusou: serviço parado ou porta errada.',
      };
    }
    return {
      blame: 'device',
      rule: 'R4_local_reach_proven',
      reason:
        'O agente está na mesma rede e mesmo assim não obteve resposta: o equipamento está mudo.',
    };
  }

  // R5 — da nuvem (ou pelo túnel), o caminho é opaco: acusar o equipamento seria injusto.
  return {
    blame: 'transport',
    rule: 'R5_remote_path_opaque',
    reason:
      runFrom === 'relay'
        ? 'A falha ocorreu através do túnel do agente: o caminho ainda é suspeito, não o equipamento.'
        : 'A falha ocorreu a partir da nuvem, sem alcance à rede local: o caminho é o suspeito.',
  };
}

/** Atalho quando só interessa o rótulo. */
export function blameOf(input: BlameInput): FailureBlame {
  return deriveBlame(input).blame;
}

/** Todos os valores possíveis — usado por testes e pela migração como fonte da verdade. */
export const FAILURE_BLAME_VALUES: readonly FailureBlame[] = [
  'device',
  'transport',
  'config',
  'caller',
  'cloud',
  'unknown',
] as const;
