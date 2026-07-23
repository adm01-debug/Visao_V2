import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  LivePreviewPlayer,
  LIVE_PREVIEW_DEFAULT_SECONDS,
  LIVE_PREVIEW_EXTEND_SECONDS,
  LIVE_PREVIEW_MAX_EXTENSIONS,
} from "../LivePreviewPlayer";

type InvokeAction = "start" | "extend" | "stop";
type InvokeCall = { action: InvokeAction; payload: Record<string, unknown> };

function makeInvoke(overrides: Partial<Record<InvokeAction, () => Promise<any>>> = {}) {
  const calls: InvokeCall[] = [];
  const fn = vi.fn(async (action: InvokeAction, payload: Record<string, unknown>) => {
    calls.push({ action, payload });
    if (overrides[action]) return overrides[action]!();
    if (action === "start")
      return { sessionId: "sess-1", hlsUrl: "https://mediamtx.test/prev_x/index.m3u8", expiresAt: new Date().toISOString() };
    if (action === "extend")
      return { sessionId: "sess-1", expiresAt: new Date().toISOString() };
    return { sessionId: "sess-1", stopped: true };
  });
  return { fn, calls };
}

const RTSP = "rtsp://user:pass@10.0.0.1:554/stream";

describe("LivePreviewPlayer", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("inicia a prévia via botão e exibe countdown de 60s", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const { fn } = makeInvoke();
    render(<LivePreviewPlayer rtspUrl={RTSP} invoke={fn} />);

    await user.click(screen.getByTestId("live-preview-start"));

    const remaining = await screen.findByTestId("live-preview-remaining");
    expect(remaining.getAttribute("data-remaining")).toBe(String(LIVE_PREVIEW_DEFAULT_SECONDS));
    expect(fn).toHaveBeenCalledWith("start", expect.objectContaining({ rtspUrl: RTSP }));
    expect(screen.getByTestId("live-preview-player").getAttribute("data-status")).toBe("playing");
  });

  it("estende +60s ao clicar em 'Estender +60s' e chama a Edge Function", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const { fn, calls } = makeInvoke();
    render(<LivePreviewPlayer rtspUrl={RTSP} autoStart invoke={fn} />);

    // Aguarda start assíncrono resolver
    await act(async () => { await Promise.resolve(); });
    await screen.findByTestId("live-preview-extend");

    // Consome 10s do timer
    await act(async () => { vi.advanceTimersByTime(10_000); });
    const remainingBefore = Number(
      screen.getByTestId("live-preview-remaining").getAttribute("data-remaining"),
    );
    expect(remainingBefore).toBe(LIVE_PREVIEW_DEFAULT_SECONDS - 10);

    await user.click(screen.getByTestId("live-preview-extend"));
    await act(async () => { await Promise.resolve(); });

    expect(calls.find((c) => c.action === "extend")).toBeTruthy();
    const remainingAfter = Number(
      screen.getByTestId("live-preview-remaining").getAttribute("data-remaining"),
    );
    expect(remainingAfter).toBe(remainingBefore + LIVE_PREVIEW_EXTEND_SECONDS);
    expect(screen.getByTestId("live-preview-extensions").textContent).toContain(
      `+${LIVE_PREVIEW_EXTEND_SECONDS}s`,
    );
  });

  it("desabilita 'Estender' após atingir o limite máximo de extensões", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const { fn } = makeInvoke();
    render(<LivePreviewPlayer rtspUrl={RTSP} autoStart invoke={fn} />);
    await act(async () => { await Promise.resolve(); });
    await screen.findByTestId("live-preview-extend");

    for (let i = 0; i < LIVE_PREVIEW_MAX_EXTENSIONS; i++) {
      await user.click(screen.getByTestId("live-preview-extend"));
      await act(async () => { await Promise.resolve(); });
    }
    expect((screen.getByTestId("live-preview-extend") as HTMLButtonElement).disabled).toBe(true);
  });

  it("encerra automaticamente quando o countdown chega a zero", async () => {
    const onEnded = vi.fn();
    const { fn, calls } = makeInvoke();
    render(<LivePreviewPlayer rtspUrl={RTSP} autoStart invoke={fn} onEnded={onEnded} />);
    await act(async () => { await Promise.resolve(); });

    await act(async () => { vi.advanceTimersByTime((LIVE_PREVIEW_DEFAULT_SECONDS + 1) * 1000); });
    await act(async () => { await Promise.resolve(); });

    expect(calls.find((c) => c.action === "stop")).toBeTruthy();
    expect(onEnded).toHaveBeenCalledWith("timer");
  });

  it("chama 'stop' na Edge Function ao desmontar (fechar o diálogo)", async () => {
    const onEnded = vi.fn();
    const { fn, calls } = makeInvoke();
    const { unmount } = render(
      <LivePreviewPlayer rtspUrl={RTSP} autoStart invoke={fn} onEnded={onEnded} />,
    );
    await act(async () => { await Promise.resolve(); });

    unmount();
    await act(async () => { await Promise.resolve(); });

    const stopCall = calls.find((c) => c.action === "stop");
    expect(stopCall?.payload).toMatchObject({ sessionId: "sess-1" });
    expect(onEnded).toHaveBeenCalledWith("unmount");
  });

  it("encerra manualmente ao clicar em 'Encerrar'", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const { fn, calls } = makeInvoke();
    const onEnded = vi.fn();
    render(<LivePreviewPlayer rtspUrl={RTSP} autoStart invoke={fn} onEnded={onEnded} />);
    await act(async () => { await Promise.resolve(); });
    await screen.findByTestId("live-preview-stop");

    await user.click(screen.getByTestId("live-preview-stop"));
    await act(async () => { await Promise.resolve(); });

    expect(calls.find((c) => c.action === "stop")).toBeTruthy();
    expect(onEnded).toHaveBeenCalledWith("manual");
    expect(screen.getByTestId("live-preview-player").getAttribute("data-status")).toBe("ended");
  });

  it("mostra estado de erro quando 'start' falha", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const { fn } = makeInvoke({ start: async () => ({ error: "boom" }) });
    render(<LivePreviewPlayer rtspUrl={RTSP} invoke={fn} />);

    await user.click(screen.getByTestId("live-preview-start"));
    await act(async () => { await Promise.resolve(); });

    expect(screen.getByTestId("live-preview-player").getAttribute("data-status")).toBe("error");
    expect(screen.getByText(/Falha:/i)).toBeInTheDocument();
  });
});
