/**
 * Onda 150 — REGRA ÚNICA DE PERMISSÃO FINA (capabilities).
 *
 * ## O defeito que esta onda corrige
 *
 * Até aqui o sistema decide acesso por PAPEL (`admin`/`manager`/`operator`/
 * `viewer`) e por RLS de dono. Isso resolve "quem entra na tela", mas não
 * resolve o pedido real da operação de CFTV clássica (SIM Next, Fase 1 do
 * plano de paridade): **exceções nominais**.
 *
 *  - o técnico terceirizado precisa mover PTZ de UMA semana, sem virar
 *    `operator` para sempre;
 *  - o auditor precisa exportar gravação, mas jamais apagar;
 *  - o operador de plantão perde temporariamente o direito de despachar
 *    para a central enquanto está em treinamento.
 *
 * Hoje só existem dois movimentos: promover o papel (excesso permanente) ou
 * negar (bloqueio total). Os dois estão errados, e o primeiro é o perigoso —
 * promoções "temporárias" nunca são revertidas.
 *
 * Este módulo é a **regra única** que transforma `papel + concessões` em um
 * conjunto efetivo de capacidades. É puro: sem React, sem rede e **sem
 * relógio próprio** (o instante é injetado), para que o CI possa varrer
 * centenas de cenários e o banco possa espelhar exatamente a mesma regra em
 * `public.has_capability()`.
 *
 * ## Decisões e o porquê
 *
 *  - **Papel é PISO, concessão é DELTA.** O papel continua sendo a fonte
 *    principal; a concessão só ajusta as bordas. Assim uma regressão no
 *    catálogo nunca deixa um papel inteiro sem acesso.
 *  - **`deny` vence `grant`, sempre.** Empate resolvido para o lado seguro.
 *    Se as duas linhas existirem, a intenção mais recente é irrelevante: a
 *    negação é o estado defensável perante auditoria.
 *  - **Concessão vencida ou revogada não existe.** Não há estado "expirando":
 *    a comparação é feita contra o instante injetado, e `expires_at` no
 *    passado equivale a nunca ter existido. Isso torna o expurgo da linha
 *    inócuo para a decisão (a linha é prova, não regra).
 *  - **Capacidade fora do catálogo é ignorada.** Concessão órfã (capacidade
 *    removida numa versão futura) não pode virar acesso fantasma.
 *  - **Anti-lockout: `admin` nunca perde `users.grant_capability`.** Sem essa
 *    trava, um `deny` mal aplicado deixaria o sistema sem ninguém capaz de
 *    remover o próprio `deny` — falha irreversível sem acesso ao banco.
 *  - **Ordem da lista não importa.** A resolução é um conjunto, não uma
 *    pilha: duas listas com as mesmas linhas em ordens diferentes produzem
 *    exatamente o mesmo resultado.
 *
 * Invariantes varridas pelos testes e pela simulação:
 *   C1 conjunto efetivo ⊆ catálogo (nunca inventa capacidade)
 *   C2 o piso dos papéis é monotônico: viewer ⊂ operator ⊂ manager ⊂ admin
 *   C3 `deny` vence `grant` para a mesma capacidade
 *   C4 concessão vencida/revogada não altera o resultado
 *   C5 `admin` sempre mantém `users.grant_capability`
 *   C6 a resolução independe da ordem das concessões
 *   C7 função total: todo papel resolve, mesmo sem concessão alguma
 */

export type AppRole = 'admin' | 'manager' | 'operator' | 'viewer';

/** Capacidades reconhecidas pelo sistema. Catálogo fechado e versionado. */
export const CAPABILITIES = [
  'cameras.view',
  'cameras.manage',
  'cameras.ptz.control',
  'cameras.ptz.calibrate',
  'cameras.control_io',
  'recordings.view',
  'recordings.export',
  'recordings.delete',
  'alerts.view',
  'alerts.acknowledge',
  'alerts.dispatch',
  'maintenance.view',
  'maintenance.acknowledge',
  'collab.view',
  'collab.govern',
  'agents.view',
  'agents.heal',
  'users.view',
  'users.manage',
  'users.grant_capability',
  'audit.view',
] as const;

export type Capability = (typeof CAPABILITIES)[number];

const CAPABILITY_SET: ReadonlySet<string> = new Set<string>(CAPABILITIES);

/** Rótulos em PT-BR para o console de permissões. */
export const CAPABILITY_LABELS: Record<Capability, string> = {
  'cameras.view': 'Ver câmeras',
  'cameras.manage': 'Cadastrar e editar câmeras',
  'cameras.ptz.control': 'Movimentar PTZ',
  'cameras.ptz.calibrate': 'Calibrar limites de PTZ',
  'cameras.control_io': 'Acionar saídas de alarme (relé, sirene, portão)',
  'recordings.view': 'Ver gravações',
  'recordings.export': 'Exportar gravações',
  'recordings.delete': 'Apagar gravações',
  'alerts.view': 'Ver alertas',
  'alerts.acknowledge': 'Tratar alertas',
  'alerts.dispatch': 'Despachar para central',
  'maintenance.view': 'Ver console de manutenção',
  'maintenance.acknowledge': 'Reconhecer manutenção',
  'collab.view': 'Ver rede colaborativa',
  'collab.govern': 'Governar rede colaborativa',
  'agents.view': 'Ver agentes locais',
  'agents.heal': 'Acionar auto-cura de agentes',
  'users.view': 'Ver usuários',
  'users.manage': 'Gerenciar usuários',
  'users.grant_capability': 'Conceder permissões finas',
  'audit.view': 'Ver trilha de auditoria',
};

/**
 * Piso por papel. Escrito em cascata explícita (e não por herança implícita)
 * para que a leitura do arquivo mostre o conjunto real de cada papel — quem
 * audita permissão não deveria precisar executar código para saber o que um
 * `operator` pode fazer.
 */
const VIEWER_BASELINE: readonly Capability[] = ['cameras.view', 'recordings.view', 'alerts.view'];

const OPERATOR_BASELINE: readonly Capability[] = [
  ...VIEWER_BASELINE,
  'cameras.ptz.control',
  'recordings.export',
  'alerts.acknowledge',
  'maintenance.view',
  'collab.view',
  'agents.view',
];

const MANAGER_BASELINE: readonly Capability[] = [
  ...OPERATOR_BASELINE,
  'cameras.manage',
  'cameras.ptz.calibrate',
  'cameras.control_io',
  'alerts.dispatch',
  'maintenance.acknowledge',
  'collab.govern',
  'users.view',
  'audit.view',
];

const ADMIN_BASELINE: readonly Capability[] = [...CAPABILITIES];

export const ROLE_BASELINE: Record<AppRole, readonly Capability[]> = {
  viewer: VIEWER_BASELINE,
  operator: OPERATOR_BASELINE,
  manager: MANAGER_BASELINE,
  admin: ADMIN_BASELINE,
};

/**
 * Capacidades que um `admin` nunca perde, mesmo com `deny` explícito.
 * Sem isso o sistema pode ser trancado por fora, de forma irreversível.
 */
export const ADMIN_LOCKOUT_GUARD: readonly Capability[] = ['users.grant_capability'];

export type CapabilityGrantEffect = 'grant' | 'deny';

/** Linha de concessão, no formato em que chega do banco. */
export interface CapabilityGrant {
  /** Identificador da capacidade. `string` de propósito: pode ser órfã. */
  capability: string;
  effect: CapabilityGrantEffect;
  /** Epoch ms. `null` = sem prazo. */
  expiresAtMs: number | null;
  /** Epoch ms. Preenchido = concessão revogada, logo inexistente. */
  revokedAtMs?: number | null;
}

export interface EffectiveCapabilities {
  role: AppRole;
  /** Conjunto final, já com piso, deltas e trava anti-lockout aplicados. */
  granted: ReadonlySet<Capability>;
  /** Capacidades acrescentadas por concessão ativa além do piso do papel. */
  addedByGrant: readonly Capability[];
  /** Capacidades do piso removidas por negação ativa. */
  removedByDeny: readonly Capability[];
  /** Concessões descartadas (vencidas, revogadas ou fora do catálogo). */
  ignored: readonly CapabilityGrant[];
}

/** Verdadeiro quando a concessão vale no instante informado. */
export function isGrantActive(grant: CapabilityGrant, nowMs: number): boolean {
  if (grant.revokedAtMs !== null && grant.revokedAtMs !== undefined && grant.revokedAtMs <= nowMs)
    return false;
  if (grant.expiresAtMs !== null && grant.expiresAtMs !== undefined && grant.expiresAtMs <= nowMs)
    return false;
  return true;
}

/** Verdadeiro quando o identificador pertence ao catálogo fechado. */
export function isKnownCapability(value: string): value is Capability {
  return CAPABILITY_SET.has(value);
}

/**
 * Regra única. Puro e determinístico: mesmo papel + mesmas linhas + mesmo
 * instante ⇒ mesmo resultado, independentemente da ordem das linhas.
 */
export function resolveCapabilities(
  role: AppRole,
  grants: readonly CapabilityGrant[],
  nowMs: number
): EffectiveCapabilities {
  const granted = new Set<Capability>(ROLE_BASELINE[role]);
  const ignored: CapabilityGrant[] = [];
  const denied = new Set<Capability>();
  const allowed = new Set<Capability>();

  for (const grant of grants) {
    if (!isKnownCapability(grant.capability) || !isGrantActive(grant, nowMs)) {
      ignored.push(grant);
      continue;
    }
    if (grant.effect === 'deny') denied.add(grant.capability);
    else allowed.add(grant.capability);
  }

  const addedByGrant: Capability[] = [];
  for (const capability of allowed) {
    if (denied.has(capability)) continue; // C3: negação vence.
    if (granted.has(capability)) continue; // já vinha do piso.
    granted.add(capability);
    addedByGrant.push(capability);
  }

  const removedByDeny: Capability[] = [];
  for (const capability of denied) {
    if (role === 'admin' && ADMIN_LOCKOUT_GUARD.includes(capability)) continue; // C5
    if (!granted.delete(capability)) continue;
    removedByDeny.push(capability);
  }

  return {
    role,
    granted,
    addedByGrant: addedByGrant.sort(),
    removedByDeny: removedByDeny.sort(),
    ignored,
  };
}

/** Atalho de leitura para a UI e para os guardas de rota. */
export function hasCapability(effective: EffectiveCapabilities, capability: Capability): boolean {
  return effective.granted.has(capability);
}

/** Lista ordenada — útil para telas e para comparação estável em testes. */
export function listCapabilities(effective: EffectiveCapabilities): Capability[] {
  return [...effective.granted].sort();
}
