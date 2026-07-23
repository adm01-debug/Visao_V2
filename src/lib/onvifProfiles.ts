/**
 * VISÃO — Catálogo estático de perfis ONVIF/RTSP por firmware OEM.
 *
 * Cada `OnvifProfile` descreve as características ONVIF/RTSP de uma família
 * de hardware, extraídas por engenharia reversa do firmware do fabricante.
 * É consumido pelo edge function `onvif-autodiscover` (para escolher a ordem
 * correta de portas e sondas) e pelo wizard de cadastro de câmeras (para
 * pré-selecionar variantes RTSP recomendadas).
 *
 * A biblioteca é 100% client/edge-safe: sem I/O, sem dependências externas.
 */
import type { RtspBrand } from "./rtspTemplates";

export type OnvifWsdl =
  | "device"
  | "media_v10"
  | "media_v20"
  | "ptz_v20"
  | "imaging_v20"
  | "events"
  | "analytics_v20"
  | "deviceIO"
  | "replay"
  | "search"
  | "recording"
  | "thermal"
  | "accesscontrol";

export type OnvifProbeType =
  | "dn:NetworkVideoTransmitter"
  | "tds:Device";

export interface OnvifProfileRtspVariant {
  /** Marca em `RTSP_TEMPLATES` onde o template está catalogado. */
  brand: RtspBrand;
  /** Id do template dentro de `RTSP_TEMPLATES[brand]`. */
  templateId: string;
  /** Se marcado, é a variante preferida deste perfil. */
  recommended?: boolean;
}

export interface OnvifProfile {
  /** Identificador estável (não traduzido). */
  id: string;
  /** Fabricante OEM real (não a marca comercial). */
  vendor: string;
  /** Nome exibido no wizard. */
  displayName: string;
  /**
   * Identificadores de hardware conhecidos.
   * Aceita string literal (match exato case-insensitive) OU prefixo com `*`
   * no final (ex.: `"NBD80X*"` cobre toda a família).
   */
  hardwareIds: string[];
  /** Porta ONVIF padrão declarada pelo firmware. */
  onvifPort: number;
  /** Portas alternativas em ordem de tentativa. */
  onvifPortFallbacks: number[];
  /** Path SOAP do device_service. */
  onvifPath: string;
  /** WSDLs efetivamente suportados pelo firmware. */
  supportedWsdl: OnvifWsdl[];
  /** Variantes RTSP catalogadas em `rtspTemplates.ts`. */
  rtspVariants: OnvifProfileRtspVariant[];
  /** Dicas para o autodiscover. */
  discoveryHints: {
    /** Tipos de Probe WS-Discovery que este OEM responde. */
    probeTypes: OnvifProbeType[];
  };
  /** Protocolos PTZ nativos embarcados (nome interno do firmware). */
  ptzBackends: string[];
  /** Observações operacionais relevantes. */
  notes?: string;
}

/**
 * XiongMai HZXM (fabricante OEM real por trás de Usecam, Tecvoz OEM e outros).
 * Extraído do firmware `YK_HZXM_NBD80X08S-QWG-V3_V4.03.R11.Nat.dss.OnvifC.20230505`.
 * Cobre a família NVR NBD80X* (8ch/16ch).
 */
const XIONGMAI_NBD80X: OnvifProfile = {
  id: "xiongmai-nbd80x",
  vendor: "XiongMai (HZXM)",
  displayName: "XiongMai NVR NBD80X (Usecam OEM)",
  hardwareIds: ["NBD80X*", "NBD80X08S-QWG-V3", "NBD80X16S*"],
  onvifPort: 8899,
  onvifPortFallbacks: [80, 8080],
  onvifPath: "/onvif/device_service",
  supportedWsdl: [
    "device",
    "media_v10",
    "media_v20",
    "ptz_v20",
    "imaging_v20",
    "events",
    "analytics_v20",
    "deviceIO",
    "replay",
    "search",
    "recording",
    "thermal",
    "accesscontrol",
  ],
  rtspVariants: [
    { brand: "xiongmai", templateId: "xm-xmeye-legacy", recommended: true },
    { brand: "xiongmai", templateId: "xm-live-chnn" },
    { brand: "xiongmai", templateId: "xm-h264-ch" },
    { brand: "xiongmai", templateId: "xm-mpeg4-ch" },
    { brand: "xiongmai", templateId: "xm-dahua-compat" },
    { brand: "xiongmai", templateId: "xm-hik-compat" },
    // Fallback histórico — câmeras cadastradas antes da marca canônica.
    { brand: "usecam", templateId: "usecam-xmeye-legacy" },
  ],

  discoveryHints: {
    // Firmwares XM antigos só respondem `tds:Device`; os mais novos respondem
    // aos dois — enviamos ambos em paralelo para maximizar a taxa de detecção.
    probeTypes: ["dn:NetworkVideoTransmitter", "tds:Device"],
  },
  ptzBackends: [
    "DaHua-SD",
    "HY",
    "Hikvision",
    "LG",
    "PANASONIC",
    "PELCO-9750",
    "PELCOASCII",
    "PELCOD-RS",
    "PELCOD-S",
    "PELCOD-S1",
    "PELCOD",
    "PELCOD1",
    "PELCOP-Std",
    "PELCOP",
    "PELCOP1",
    "PELCOP2",
    "PHILIPS",
    "SAMSUNG",
    "SANLI",
    "SANTACHI",
    "SHARP",
    "SONY",
    "YAAN",
  ],
  notes:
    "WS-Security aceita PasswordText e PasswordDigest. RTSP na porta 554. " +
    "Sofia proxya 25 protocolos PTZ para o dome/speed-dome — o cliente não precisa " +
    "escolher marca do PTZ manualmente. Firmwares muito antigos podem não expor " +
    "media_v20; o autodiscover deve cair para media_v10 se GetProfiles falhar.",
};

export const ONVIF_PROFILES: readonly OnvifProfile[] = [XIONGMAI_NBD80X] as const;

/** Compara um hardwareId do catálogo com o valor detectado (case-insensitive, prefixo `*`). */
function matchesHardwareId(pattern: string, candidate: string): boolean {
  const p = pattern.trim().toLowerCase();
  const c = candidate.trim().toLowerCase();
  if (!p || !c) return false;
  if (p.endsWith("*")) return c.startsWith(p.slice(0, -1));
  return p === c;
}

/** Resolve um perfil a partir do model/hardware retornado por GetDeviceInformation. */
export function resolveProfileByHardwareId(hardwareId: string | null | undefined): OnvifProfile | null {
  if (!hardwareId) return null;
  for (const profile of ONVIF_PROFILES) {
    if (profile.hardwareIds.some((h) => matchesHardwareId(h, hardwareId))) {
      return profile;
    }
  }
  return null;
}

/** Resolve um perfil a partir do Manufacturer + Model (heurística mais tolerante). */
export function resolveProfileByManufacturer(
  manufacturer: string | null | undefined,
  model: string | null | undefined,
): OnvifProfile | null {
  const byHw = resolveProfileByHardwareId(model);
  if (byHw) return byHw;
  const m = (manufacturer ?? "").toLowerCase();
  if (m.includes("xiongmai") || m.includes("hzxm") || m === "xm" || m.startsWith("xm ")) {
    return XIONGMAI_NBD80X;
  }
  return null;
}

/** Busca um perfil pelo id estável. */
export function getProfileById(id: string): OnvifProfile | null {
  return ONVIF_PROFILES.find((p) => p.id === id) ?? null;
}
