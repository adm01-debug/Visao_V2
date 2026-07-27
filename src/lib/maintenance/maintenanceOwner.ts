/**
 * Onda 147 — Leitura do RESPONSÁVEL na tela de manutenção.
 *
 * O banco já grava `detail.owner` nos alertas roteados por culpa
 * (`public.evaluate_blame_alerts`). Este módulo é a regra única que traduz esse
 * campo para a UI. Existe separado do `maintenanceConsoleView` porque o
 * responsável também será consumido pelo painel de saúde da frota — duplicar a
 * tradução faria as duas telas divergirem no primeiro rótulo novo.
 *
 * Princípio: **`detail` vem da rede, logo é dado não confiável.** Qualquer valor
 * fora do vocabulário vira `triage` (pedir olho humano) e nunca lança.
 * Alerta sem responsável não é erro: as rotinas das Ondas 110–135 são anteriores
 * ao roteamento e continuam válidas — elas simplesmente não têm endereço.
 */

/** Vocabulário fechado, espelho de `public.blame_owner()`. */
export type MaintenanceOwner = 'field_tech' | 'network_ops' | 'registry_admin' | 'platform' | 'triage';

const OWNER_LABELS: Readonly<Record<MaintenanceOwner, string>> = {
  field_tech: 'Técnico de campo',
  network_ops: 'Operação de rede',
  registry_admin: 'Cadastro',
  platform: 'Plataforma',
  triage: 'Triagem',
};

/** Ação esperada de quem recebe. É o motivo de cada rótulo existir. */
const OWNER_ACTIONS: Readonly<Record<MaintenanceOwner, string>> = {
  field_tech: 'Verificar o equipamento no local',
  network_ops: 'Investigar link, firewall ou NAT',
  registry_admin: 'Revisar endereço, credencial ou DNS no cadastro',
  platform: 'Escalar para a plataforma (banco, fila, armazenamento)',
  triage: 'Sem sinal suficiente — classificar manualmente',
};

const OWNERS = Object.keys(OWNER_LABELS) as readonly MaintenanceOwner[];

export interface OwnerRouting {
  readonly owner: MaintenanceOwner;
  readonly label: string;
  readonly action: string;
  /** Quantas câmeras o alerta abrange; `null` quando o alerta não informa. */
  readonly cameras: number | null;
  /** `agent` = causa comum consolidada; `fleet` = frota; `camera` = localizado. */
  readonly scope: 'fleet' | 'agent' | 'camera' | null;
}

function readString(detail: Record<string, unknown> | null, key: string): string | null {
  const value = detail?.[key];
  return typeof value === 'string' && value.length > 0 ? value : null;
}

/**
 * Extrai o roteamento de um alerta. Retorna `null` quando o alerta não é
 * roteado por culpa — a tela deve continuar exibindo o alerta normalmente,
 * apenas sem o crachá de responsável.
 */
export function readOwnerRouting(detail: Record<string, unknown> | null): OwnerRouting | null {
  const raw = readString(detail, 'owner');
  if (raw === null) return null;

  const owner: MaintenanceOwner = (OWNERS as readonly string[]).includes(raw)
    ? (raw as MaintenanceOwner)
    : 'triage';

  const rawScope = readString(detail, 'scope');
  const scope =
    rawScope === 'fleet' || rawScope === 'agent' || rawScope === 'camera' ? rawScope : null;

  const rawCameras = detail?.cameras;
  const cameras =
    typeof rawCameras === 'number' && Number.isFinite(rawCameras) && rawCameras >= 0
      ? Math.trunc(rawCameras)
      : null;

  return { owner, label: OWNER_LABELS[owner], action: OWNER_ACTIONS[owner], cameras, scope };
}

/** Rótulo curto do escopo, para o crachá. */
export function scopeLabel(routing: OwnerRouting): string | null {
  switch (routing.scope) {
    case 'agent':
      return routing.cameras === null
        ? 'causa comum'
        : `causa comum · ${routing.cameras} câmeras`;
    case 'fleet':
      return routing.cameras && routing.cameras > 0 ? `frota · ${routing.cameras} câmeras` : 'frota';
    case 'camera':
      return 'câmera';
    default:
      return null;
  }
}
