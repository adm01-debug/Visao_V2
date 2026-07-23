import { describe, it, expect } from "vitest";
import {
  LIVE_PREVIEW_ERROR_CODES,
  resolveLivePreviewError,
} from "@/lib/livePreviewErrors";

describe("livePreviewErrors — resolveLivePreviewError", () => {
  it("mapeia mediamtx_pull_failed com sugestão de firewall/credenciais", () => {
    const { code, info } = resolveLivePreviewError("mediamtx_pull_failed");
    expect(code).toBe("mediamtx_pull_failed");
    expect(info.title).toMatch(/MediaMTX.*conectar/i);
    expect(info.suggestion).toMatch(/firewall|credenciais|554/i);
    expect(info.retryable).toBe(true);
    expect(info.severity).toBe("error");
  });

  it("mapeia hls_timeout mencionando o prazo de 10s e substream", () => {
    const { info } = resolveLivePreviewError("hls_timeout");
    expect(info.title).toMatch(/HLS/i);
    expect(info.suggestion).toMatch(/10s|substream|latência/i);
  });

  it("mapeia connection_dropped destacando estabilidade Wi-Fi/PoE", () => {
    const { info } = resolveLivePreviewError("connection_dropped");
    expect(info.title).toMatch(/caiu|conexão/i);
    expect(info.suggestion).toMatch(/wi-?fi|poe|reinicie/i);
  });

  it("normaliza códigos desconhecidos para 'unknown'", () => {
    const { code, info } = resolveLivePreviewError("codigo_inexistente_xyz");
    expect(code).toBe("unknown");
    expect(info.title).toMatch(/inesperado/i);
  });

  it("aceita null/undefined sem lançar", () => {
    expect(resolveLivePreviewError(null).code).toBe("unknown");
    expect(resolveLivePreviewError(undefined).code).toBe("unknown");
  });

  it("normaliza case e whitespace", () => {
    const { code } = resolveLivePreviewError("  MediaMTX_Pull_Failed  ");
    expect(code).toBe("mediamtx_pull_failed");
  });

  it("todos os códigos declarados possuem título e sugestão não-vazios", () => {
    for (const c of LIVE_PREVIEW_ERROR_CODES) {
      const { info } = resolveLivePreviewError(c);
      expect(info.title.length).toBeGreaterThan(3);
      expect(info.suggestion.length).toBeGreaterThan(10);
    }
  });
});
