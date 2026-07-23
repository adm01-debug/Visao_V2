/**
 * VISÃO — Assinaturas de firmware para autodetecção de marca/modelo.
 *
 * 100% client/edge-safe: sem I/O, sem dependências. Cada assinatura define
 * strings-chave (ASCII / UTF-16LE) e/ou magic bytes cuja presença no binário
 * do firmware indica o fabricante. O detector converte cada evidência em
 * score parcial e agrega por marca.
 *
 * Adicione novas assinaturas aqui — o detector as consome automaticamente.
 */
import type { RtspBrand } from "./rtspTemplates";

export interface FirmwareSignature {
  /** Marca canônica no catálogo `RTSP_TEMPLATES`. */
  brandId: RtspBrand;
  /** Perfil ONVIF sugerido (id de `onvifProfiles.ts`), quando aplicável. */
  profileId?: string;
  /** Nome exibido no wizard. */
  displayName: string;
  /** Modelos/hardware conhecidos cobertos por essa assinatura. */
  modelHints: string[];
  /** Ids de templates RTSP em `RTSP_TEMPLATES[brandId]`, na ordem sugerida. */
  templateIds: string[];
  /** Portas padrão sugeridas — sobrescrevem o form quando aplicado. */
  defaultPorts: { rtsp: number; onvif: number; http: number };
  /** Strings ASCII únicas do fabricante (case-insensitive). Peso alto. */
  strongStrings: string[];
  /** Strings mais fracas / potencialmente compartilhadas. Peso baixo. */
  weakStrings?: string[];
  /**
   * Magic bytes iniciais (offset 0 por padrão). Cada entrada é um Uint8Array
   * literal — o detector faz comparação byte-a-byte no offset informado.
   */
  magicBytes?: Array<{ offset?: number; bytes: number[] }>;
  /** Observação humana curta exibida no card. */
  notes?: string;
}

export const FIRMWARE_SIGNATURES: readonly FirmwareSignature[] = [
  // XiongMai (HZXM / Sofia) — OEM real por trás de Usecam, Tecvoz OEM etc.
  {
    brandId: "xiongmai",
    profileId: "xiongmai-nbd80x",
    displayName: "XiongMai / HZXM (Sofia)",
    modelHints: ["NBD80X08S-QWG-V3", "NBD80X16S", "NBD80X*"],
    templateIds: ["xm-xmeye-legacy", "xm-live-chnn", "xm-h264-ch"],
    defaultPorts: { rtsp: 554, onvif: 8899, http: 80 },
    strongStrings: ["Sofia", "HZXM", "XMEYE", "dvrsvr", "XM_", "NBD80X"],
    weakStrings: ["xmeye", "XiongMai"],
    notes: "Firmware Sofia (HZXM/XM). ONVIF em 8899, RTSP com stream=0.sdp.",
  },
  // Hikvision
  {
    brandId: "hikvision",
    displayName: "Hikvision",
    modelHints: ["DS-2CD*", "DS-7xxx"],
    templateIds: ["hik-ipc-main-sub", "hik-nvr", "hik-isapi-legacy"],
    defaultPorts: { rtsp: 554, onvif: 80, http: 80 },
    strongStrings: ["hikvision", "HIKVISION", "ISAPI", "davinci"],
    weakStrings: ["Streaming/Channels"],
    notes: "Hikvision — ISAPI + ONVIF na porta 80. RTSP /Streaming/Channels/N01.",
  },
  // Dahua
  {
    brandId: "dahua",
    displayName: "Dahua Technology",
    modelHints: ["IPC-HFW*", "IPC-HDW*", "NVR4xxx"],
    templateIds: ["dahua-ipc", "dahua-nvr"],
    defaultPorts: { rtsp: 554, onvif: 80, http: 80 },
    strongStrings: ["dahua", "DAHUA", "DVRIPweb", "General.dh"],
    weakStrings: ["cam/realmonitor"],
    notes: "Firmwares Dahua/OEM — RTSP /cam/realmonitor?channel=N&subtype=0.",
  },
  // Intelbras (padrão Dahua rebrand)
  {
    brandId: "intelbras",
    displayName: "Intelbras",
    modelHints: ["VIP*", "iM*", "MHDX*"],
    templateIds: ["intelbras-vip", "intelbras-mhdx"],
    defaultPorts: { rtsp: 554, onvif: 80, http: 80 },
    strongStrings: ["intelbras", "INTELBRAS"],
    weakStrings: ["cam/realmonitor"],
    notes: "Linha VIP/iM/MHDX Intelbras — RTSP idêntico ao Dahua.",
  },
  // Usecam (rebrand XM em alguns modelos, Dahua-like em outros)
  {
    brandId: "usecam",
    displayName: "Usecam",
    modelHints: ["UC-NVR*", "UC-IPC*"],
    templateIds: ["usecam-nvr-dahua-like", "usecam-xmeye-legacy", "usecam-hik-like"],
    defaultPorts: { rtsp: 554, onvif: 8899, http: 80 },
    strongStrings: ["Usecam", "USECAM", "uc-nvr", "UC-NVR"],
    weakStrings: [],
    notes: "Usecam OEM — muitos modelos rodam Sofia (XM) por baixo.",
  },
] as const;

/** Retorna a assinatura pela marca. */
export function getSignatureByBrand(brand: RtspBrand): FirmwareSignature | undefined {
  return FIRMWARE_SIGNATURES.find((s) => s.brandId === brand);
}
