// Motor de sugestões — funções puras testáveis.
export type Severity = "info" | "warn" | "critical";
export interface Suggestion {
  code: string;
  severity: Severity;
  message: string;
}

export interface SuggestionInput {
  ok: boolean;
  timeout: boolean;
  httpStatus?: number;
  latencyAvg: number;
  jitter: number;
  lossPct: number;
  codec?: string | null;
  resolution?: string | null;
  fps?: number | null;
  fpsSource?: "framerate" | "x-framerate" | "fmtp" | "sps-timing" | null;
  resolutionSource?:
    | "cliprect"
    | "x-dimensions"
    | "framesize"
    | "fmtp"
    | "sps"
    | null;
  authMethod?: "none" | "basic" | "digest" | null;
  hasSubstream: boolean;
  target: "primary" | "substream" | "inline";
}

export function buildSuggestions(i: SuggestionInput): Suggestion[] {
  const out: Suggestion[] = [];

  if (!i.ok) {
    if (i.timeout) {
      out.push({
        code: "TIMEOUT",
        severity: "critical",
        message:
          "Sem resposta da câmera. Verifique IP público / port-forward na porta 554 e se as credenciais estão corretas.",
      });
    } else if (i.httpStatus === 401 || i.httpStatus === 403) {
      out.push({
        code: "AUTH_FAILED",
        severity: "critical",
        message: "Credenciais rejeitadas pela câmera. Revise usuário e senha.",
      });
    } else {
      out.push({
        code: "HANDSHAKE_FAILED",
        severity: "critical",
        message: `Falha no handshake RTSP (status ${i.httpStatus ?? "desconhecido"}). Verifique a URL e o caminho do stream.`,
      });
    }
    return out;
  }

  if (i.lossPct > 20) {
    out.push({
      code: "PACKET_LOSS",
      severity: "critical",
      message: `Perda de pacotes crítica (${i.lossPct.toFixed(0)}%). Verifique firewall, NAT e QoS da rede.`,
    });
  }
  if (i.latencyAvg > 800) {
    out.push({
      code: "LATENCY_CRITICAL",
      severity: "critical",
      message: `Latência muito alta (${i.latencyAvg.toFixed(0)} ms). O stream ficará instável — verifique a rota até a câmera.`,
    });
  } else if (i.latencyAvg > 400) {
    out.push({
      code: "LATENCY_HIGH",
      severity: "warn",
      message: `Latência elevada (${i.latencyAvg.toFixed(0)} ms). Considere gerar HLS via MediaMTX ou usar substream para preview.`,
    });
  }
  if (i.jitter > 150) {
    out.push({
      code: "JITTER_CRITICAL",
      severity: "critical",
      message: `Jitter muito alto (${i.jitter.toFixed(0)} ms). Rede instável; troque para transporte TCP ou reduza a resolução.`,
    });
  } else if (i.jitter > 50) {
    out.push({
      code: "JITTER_WARN",
      severity: "warn",
      message: `Jitter moderado (${i.jitter.toFixed(0)} ms). Se possível, use transporte TCP (?tcp) para o RTSP.`,
    });
  }

  if (i.codec && /H\.?265|HEVC/i.test(i.codec)) {
    out.push({
      code: "CODEC_HEVC",
      severity: "warn",
      message:
        "HEVC (H.265) não é suportado por todos os navegadores. Habilite transcodificação para H.264 no MediaMTX.",
    });
  }

  const heightMatch = i.resolution?.match(/\d+x(\d+)/);
  const height = heightMatch ? Number(heightMatch[1]) : 0;

  if (i.target !== "substream" && !i.hasSubstream) {
    out.push({
      code: "SUBSTREAM_MISSING",
      severity: "info",
      message:
        "Cadastre um substream de baixa resolução (Channels/102 na Hikvision, subtype=1 na Dahua) para reduzir a carga da IA.",
    });
  }
  if (height > 1080 && !i.hasSubstream) {
    out.push({
      code: "HIGH_RES_NO_SUBSTREAM",
      severity: "warn",
      message: `Resolução alta (${i.resolution}) sem substream aumenta muito o custo de análise IA.`,
    });
  }

  if (i.authMethod === "basic") {
    out.push({
      code: "AUTH_BASIC",
      severity: "warn",
      message: "Câmera usa Basic Auth (senha em texto claro na rede). Prefira Digest quando disponível.",
    });
  }

  if (out.length === 0) {
    out.push({
      code: "ALL_GOOD",
      severity: "info",
      message: "Stream saudável. Nenhum ajuste necessário.",
    });
  }
  return out;
}

export function computeScore(i: {
  ok: boolean;
  latencyAvg: number;
  jitter: number;
  lossPct: number;
}): "ok" | "warn" | "critical" {
  if (!i.ok) return "critical";
  if (i.lossPct > 20 || i.jitter > 150 || i.latencyAvg > 800) return "critical";
  if (i.lossPct > 0 || i.jitter > 50 || i.latencyAvg > 300) return "warn";
  return "ok";
}
