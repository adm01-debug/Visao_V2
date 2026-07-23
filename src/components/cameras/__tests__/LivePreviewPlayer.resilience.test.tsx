/**
 * VISÃO — Testes de resiliência do LivePreviewPlayer.
 *
 * Cobre mediamtx_pull_failed, hls_timeout (watchdog), connection_dropped
 * (evento `error` do <video>) e extend_failed. Garante que o `invoke('stop')`
 * é chamado em falhas com sessão ativa e que a mensagem/sugestão exibida
 * corresponde ao código emitido.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, fireEvent, cleanup } from "@testing-library/react";
import {
  LivePreviewPlayer,
  LIVE_PREVIEW_HLS_TIMEOUT_MS,
} from "@/components/cameras/LivePreviewPlayer";

function makeInvoke(overrides: {
  startError?: string;
  extendError?: string;
} = {}) {
  const calls: Array<{ action: string; payload: Record<string, unknown> }> = [];
  const invoke = vi.fn(async (action: string, payload: Record<string, unknown>) => {
    calls.push({ action, payload });
    if (action === "start") {
      if (overrides.startError) return { error: overrides.startError };
      return { sessionId: "sess-1", hlsUrl: "blob:hls-mock" };
    }
    if (action === "extend") {
      if (overrides.extendError) return { error: overrides.extendError };
      return { sessionId: "sess-1" };
    }
    return { sessionId: "sess-1", stopped: true };
  });
  return { invoke, calls };
}

async function flushMicrotasks() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe("LivePreviewPlayer — resiliência", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("mediamtx_pull_failed: exibe título + sugestão específica e NÃO chama stop (sem sessão)", async () => {
    const { invoke, calls } = makeInvoke({ startError: "mediamtx_pull_failed" });
    const onEnded = vi.fn();
    render(
      <LivePreviewPlayer
        rtspUrl="rtsp://10.0.0.1/stream"
        invoke={invoke as never}
        onEnded={onEnded}
      />,
    );
    fireEvent.click(screen.getByTestId("live-preview-start"));
    await flushMicrotasks();

    const err = screen.getByTestId("live-preview-error");
    expect(err.getAttribute("data-error-code")).toBe("mediamtx_pull_failed");
    expect(err.textContent).toMatch(/MediaMTX/i);
    expect(err.textContent).toMatch(/firewall|credenciais|554/i);
    expect(onEnded).toHaveBeenCalledWith("error");
    expect(calls.filter((c) => c.action === "stop")).toHaveLength(0);
  });

  it("hls_timeout: watchdog dispara após 10s sem canplay, chama stop e mostra sugestão", async () => {
    const { invoke, calls } = makeInvoke();
    render(<LivePreviewPlayer rtspUrl="rtsp://10.0.0.1/s" invoke={invoke as never} />);
    fireEvent.click(screen.getByTestId("live-preview-start"));
    await flushMicrotasks();
    expect(screen.getByTestId("live-preview-video")).toBeInTheDocument();

    // Nada de canplay → watchdog fecha após LIVE_PREVIEW_HLS_TIMEOUT_MS.
    await act(async () => {
      vi.advanceTimersByTime(LIVE_PREVIEW_HLS_TIMEOUT_MS + 100);
      await Promise.resolve();
    });
    await flushMicrotasks();

    const err = screen.getByTestId("live-preview-error");
    expect(err.getAttribute("data-error-code")).toBe("hls_timeout");
    expect(err.textContent).toMatch(/HLS/i);
    expect(err.textContent).toMatch(/10s|substream|latência/i);
    const stopCall = calls.find((c) => c.action === "stop");
    expect(stopCall?.payload.sessionId).toBe("sess-1");
  });

  it("canplay antes do prazo cancela o watchdog (sem falha espúria)", async () => {
    const { invoke, calls } = makeInvoke();
    render(<LivePreviewPlayer rtspUrl="rtsp://10.0.0.1/s" invoke={invoke as never} />);
    fireEvent.click(screen.getByTestId("live-preview-start"));
    await flushMicrotasks();
    fireEvent.canPlay(screen.getByTestId("live-preview-video"));
    await act(async () => {
      vi.advanceTimersByTime(LIVE_PREVIEW_HLS_TIMEOUT_MS + 500);
    });
    expect(screen.queryByTestId("live-preview-error")).toBeNull();
    expect(calls.some((c) => c.action === "stop")).toBe(false);
  });

  it("connection_dropped: onError do <video> encerra sessão com sugestão de Wi-Fi/PoE", async () => {
    const { invoke, calls } = makeInvoke();
    render(<LivePreviewPlayer rtspUrl="rtsp://10.0.0.1/s" invoke={invoke as never} />);
    fireEvent.click(screen.getByTestId("live-preview-start"));
    await flushMicrotasks();

    fireEvent.error(screen.getByTestId("live-preview-video"));
    await flushMicrotasks();

    const err = screen.getByTestId("live-preview-error");
    expect(err.getAttribute("data-error-code")).toBe("connection_dropped");
    expect(err.textContent).toMatch(/Wi-?Fi|PoE|reinicie/i);
    const stop = calls.find((c) => c.action === "stop");
    expect(stop?.payload.sessionId).toBe("sess-1");
  });

  it("extend_failed: exibe warning inline mantendo a prévia ativa", async () => {
    const { invoke } = makeInvoke({ extendError: "extend_failed" });
    render(<LivePreviewPlayer rtspUrl="rtsp://10.0.0.1/s" invoke={invoke as never} />);
    fireEvent.click(screen.getByTestId("live-preview-start"));
    await flushMicrotasks();
    fireEvent.click(screen.getByTestId("live-preview-extend"));
    await flushMicrotasks();

    const warn = screen.getByTestId("live-preview-warning");
    expect(warn.getAttribute("data-error-code")).toBe("extend_failed");
    expect(warn.textContent).toMatch(/estender/i);
    // Vídeo continua montado.
    expect(screen.getByTestId("live-preview-video")).toBeInTheDocument();
  });
});
