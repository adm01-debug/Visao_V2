/**
 * VISÃO — Biblioteca de templates RTSP por marca.
 *
 * Cada template descreve o padrão de URL RTSP (principal e substream) de um modelo
 * ou família de câmera. Os tokens `{host}`, `{port}` e `{channel}` são resolvidos
 * em runtime via `renderTemplate`. Quando a porta informada é igual à porta padrão
 * do template, o segmento `:port` é omitido da URL final para manter a URL enxuta.
 *
 * A biblioteca é 100% client-side (estática, sem fetch) e não altera schema/DB.
 */

export type RtspBrand = "hikvision" | "dahua" | "intelbras" | "usecam" | "generica";

export interface RtspTemplate {
  /** Identificador estável (não traduzido). */
  id: string;
  /** Nome exibido no seletor. */
  label: string;
  /** Descrição curta opcional. */
  description?: string;
  /** Template da URL principal, com tokens `{host}` `{port}` `{channel}`. */
  primary: string;
  /** Template opcional da URL substream. */
  substream?: string;
  /** Porta padrão RTSP (554 para maioria). */
  defaultPort: number;
}

export interface RenderContext {
  host: string;
  port?: number;
  channel?: number;
}

export const RTSP_TEMPLATES: Record<RtspBrand, RtspTemplate[]> = {
  hikvision: [
    {
      id: "hik-ipc-main-sub",
      label: "Hikvision IPC (DS-2CD Bullet/Dome)",
      description: "Padrão de câmeras IP Hikvision — main + sub stream.",
      primary: "rtsp://{host}:{port}/Streaming/Channels/{channel}01",
      substream: "rtsp://{host}:{port}/Streaming/Channels/{channel}02",
      defaultPort: 554,
    },
    {
      id: "hik-nvr",
      label: "Hikvision NVR (DS-7xxx)",
      description: "NVR/DVR Hikvision — selecione o canal desejado.",
      primary: "rtsp://{host}:{port}/Streaming/Channels/{channel}01",
      substream: "rtsp://{host}:{port}/Streaming/Channels/{channel}02",
      defaultPort: 554,
    },
    {
      id: "hik-isapi-legacy",
      label: "Hikvision legado (ISAPI antigo)",
      description: "Firmwares antigos que expõem /h264/ch1/main/av_stream.",
      primary: "rtsp://{host}:{port}/h264/ch{channel}/main/av_stream",
      substream: "rtsp://{host}:{port}/h264/ch{channel}/sub/av_stream",
      defaultPort: 554,
    },
  ],
  dahua: [
    {
      id: "dahua-ipc",
      label: "Dahua IPC (HFW/HDW)",
      description: "Câmeras IP Dahua — main (subtype=0) + sub (subtype=1).",
      primary: "rtsp://{host}:{port}/cam/realmonitor?channel={channel}&subtype=0",
      substream: "rtsp://{host}:{port}/cam/realmonitor?channel={channel}&subtype=1",
      defaultPort: 554,
    },
    {
      id: "dahua-nvr",
      label: "Dahua NVR/XVR",
      description: "Gravadores Dahua — informe o canal correspondente.",
      primary: "rtsp://{host}:{port}/cam/realmonitor?channel={channel}&subtype=0",
      substream: "rtsp://{host}:{port}/cam/realmonitor?channel={channel}&subtype=1",
      defaultPort: 554,
    },
  ],
  intelbras: [
    {
      id: "intelbras-vip",
      label: "Intelbras VIP / iM (padrão Dahua)",
      description: "Linha VIP/iM Intelbras — mesmo protocolo Dahua.",
      primary: "rtsp://{host}:{port}/cam/realmonitor?channel={channel}&subtype=0",
      substream: "rtsp://{host}:{port}/cam/realmonitor?channel={channel}&subtype=1",
      defaultPort: 554,
    },
    {
      id: "intelbras-mhdx",
      label: "Intelbras MHDX (DVR)",
      description: "DVR MHDX — canal do gravador.",
      primary: "rtsp://{host}:{port}/cam/realmonitor?channel={channel}&subtype=0",
      substream: "rtsp://{host}:{port}/cam/realmonitor?channel={channel}&subtype=1",
      defaultPort: 554,
    },
  ],
  usecam: [
    {
      id: "usecam-nvr-dahua-like",
      label: "Usecam NVR (padrão Dahua/realmonitor)",
      description: "Firmwares Usecam mais recentes — /cam/realmonitor?channel=N&subtype=0.",
      primary: "rtsp://{host}:{port}/cam/realmonitor?channel={channel}&subtype=0",
      substream: "rtsp://{host}:{port}/cam/realmonitor?channel={channel}&subtype=1",
      defaultPort: 554,
    },
    {
      id: "usecam-xmeye-legacy",
      label: "Usecam / XMEye legado (stream=0.sdp)",
      description: "Firmwares antigos baseados em XMEye — /user=..&channel=N&stream=0.sdp.",
      primary: "rtsp://{host}:{port}/user=admin&password=&channel={channel}&stream=0.sdp",
      substream: "rtsp://{host}:{port}/user=admin&password=&channel={channel}&stream=1.sdp",
      defaultPort: 554,
    },
    {
      id: "usecam-hik-like",
      label: "Usecam NVR (padrão Hikvision/Streaming)",
      description: "Alguns OEMs Usecam adotam o padrão Hikvision — /Streaming/Channels/N01.",
      primary: "rtsp://{host}:{port}/Streaming/Channels/{channel}01",
      substream: "rtsp://{host}:{port}/Streaming/Channels/{channel}02",
      defaultPort: 554,
    },
  ],
  generica: [
    {
      id: "onvif-standard",
      label: "ONVIF Profile S padrão",
      description: "Perfil genérico compatível com maioria das câmeras ONVIF.",
      primary: "rtsp://{host}:{port}/onvif1",
      substream: "rtsp://{host}:{port}/onvif2",
      defaultPort: 554,
    },
    {
      id: "reolink",
      label: "Reolink",
      description: "Câmeras Reolink — h264Preview main/sub.",
      primary: "rtsp://{host}:{port}/h264Preview_{channel:02}_main",
      substream: "rtsp://{host}:{port}/h264Preview_{channel:02}_sub",
      defaultPort: 554,
    },
    {
      id: "axis",
      label: "Axis",
      description: "Câmeras Axis Communications.",
      primary: "rtsp://{host}:{port}/axis-media/media.amp",
      defaultPort: 554,
    },
    {
      id: "generic-stream",
      label: "Genérica (stream1/stream2)",
      description: "Padrão comum em câmeras chinesas OEM.",
      primary: "rtsp://{host}:{port}/stream1",
      substream: "rtsp://{host}:{port}/stream2",
      defaultPort: 554,
    },
    {
      id: "generic-live-ch",
      label: "Genérica (live/ch00_0)",
      description: "Padrão live/chNN_0 (main) / _1 (sub).",
      primary: "rtsp://{host}:{port}/live/ch{channel:02}_0",
      substream: "rtsp://{host}:{port}/live/ch{channel:02}_1",
      defaultPort: 554,
    },
    {
      id: "generic-streaming-channels",
      label: "Genérica (Streaming/Channels/101)",
      description: "Compatível com muitos OEMs baseados no padrão Hikvision.",
      primary: "rtsp://{host}:{port}/Streaming/Channels/{channel}01",
      substream: "rtsp://{host}:{port}/Streaming/Channels/{channel}02",
      defaultPort: 554,
    },
  ],
};

/** Retorna templates de uma marca, ou array vazio se marca desconhecida. */
export function getTemplatesForBrand(brand: string): RtspTemplate[] {
  return RTSP_TEMPLATES[brand as RtspBrand] ?? [];
}

/** Localiza um template pelo id dentro de uma marca. */
export function findTemplate(brand: string, id: string): RtspTemplate | undefined {
  return getTemplatesForBrand(brand).find((t) => t.id === id);
}

/**
 * Renderiza um template substituindo `{host}`, `{port}` e `{channel}`.
 * Suporta padding `{channel:02}` para números com zero à esquerda.
 * Quando `port === defaultPort`, o segmento `:port` é removido da URL.
 */
export function renderTemplate(
  tpl: RtspTemplate,
  ctx: RenderContext,
): { primary: string; substream?: string } {
  const host = (ctx.host ?? "").trim();
  const port = ctx.port && ctx.port > 0 ? ctx.port : tpl.defaultPort;
  const channel = ctx.channel && ctx.channel > 0 ? ctx.channel : 1;
  const useDefaultPort = port === tpl.defaultPort;

  const substitute = (template: string): string => {
    let out = template
      .replace(/\{host\}/g, host)
      .replace(/\{port\}/g, String(port))
      .replace(/\{channel:02\}/g, String(channel).padStart(2, "0"))
      .replace(/\{channel\}/g, String(channel));
    if (useDefaultPort) {
      // Remove `:554` (ou o default do template) para deixar a URL enxuta.
      out = out.replace(new RegExp(`:${port}(?=/|$)`), "");
    }
    return out;
  };

  return {
    primary: substitute(tpl.primary),
    substream: tpl.substream ? substitute(tpl.substream) : undefined,
  };
}
