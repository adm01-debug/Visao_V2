/**
 * VISÃO — Prévia ao vivo (60s) do stream RTSP durante o cadastro.
 *
 * Ciclo de vida:
 *  1. `start` → Edge Function `rtsp-preview` cria sessão efêmera (path HLS assinado).
 *  2. Countdown regressivo (default 60s). Ao zerar, encerra automaticamente.
 *  3. Botão "Estender +60s" chama `extend` (limite: 3 extensões / 240s total).
 *  4. `stop` disparado ao desmontar (fechar diálogo, unmount, fim do countdown).
 *
 * Segurança:
 *  - Nunca recebe RTSP/senha em texto — apenas `sessionId` e `hlsUrl` efêmera.
 *  - Cleanup síncrono via `sendBeacon` no `beforeunload` como fallback.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, Loader2, PlayCircle, RefreshCw, StopCircle, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { resolveLivePreviewError, type LivePreviewErrorCode } from "@/lib/livePreviewErrors";

export const LIVE_PREVIEW_DEFAULT_SECONDS = 60;
export const LIVE_PREVIEW_EXTEND_SECONDS = 60;
export const LIVE_PREVIEW_MAX_EXTENSIONS = 3;
/** Prazo máximo (ms) para o vídeo emitir `canplay` após `start` bem-sucedido. */
export const LIVE_PREVIEW_HLS_TIMEOUT_MS = 10_000;

export interface LivePreviewPlayerProps {
  /** URL RTSP já resolvida (montada com credenciais no client, nunca enviada em texto ao servidor). */
  rtspUrl: string;
  /** Se `false`, mostra apenas o botão "Iniciar prévia" e aguarda ação explícita. */
  autoStart?: boolean;
  /** Callback ao encerrar (por timer, botão ou unmount). */
  onEnded?: (reason: "timer" | "manual" | "unmount" | "error") => void;
  /** Injeção para testes — substitui a chamada à Edge Function. */
  invoke?: (
    action: "start" | "extend" | "stop",
    payload: Record<string, unknown>,
  ) => Promise<{ sessionId?: string; hlsUrl?: string; expiresAt?: string; error?: string }>;
  className?: string;
}

type Status = "idle" | "starting" | "playing" | "extending" | "stopping" | "ended" | "error";

type InvokeResult = { sessionId?: string; hlsUrl?: string; expiresAt?: string; error?: string };

async function defaultInvoke(
  action: "start" | "extend" | "stop",
  payload: Record<string, unknown>,
): Promise<InvokeResult> {
  const { data, error } = await supabase.functions.invoke("rtsp-preview", {
    body: { action, ...payload },
  });
  if (error) return { error: error.message };
  return (data ?? {}) as InvokeResult;
}

export function LivePreviewPlayer({
  rtspUrl,
  autoStart = false,
  onEnded,
  invoke,
  className,
}: LivePreviewPlayerProps) {
  const [status, setStatus] = useState<Status>("idle");
  const [errorCode, setErrorCode] = useState<LivePreviewErrorCode | null>(null);
  const [remaining, setRemaining] = useState(LIVE_PREVIEW_DEFAULT_SECONDS);
  const [extensions, setExtensions] = useState(0);
  const [hlsUrl, setHlsUrl] = useState<string | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const canPlayRef = useRef(false);
  const endedRef = useRef(false);
  const invokeFn = invoke ?? defaultInvoke;

  const clearHlsTimeout = () => {
    if (hlsTimeoutRef.current) {
      clearTimeout(hlsTimeoutRef.current);
      hlsTimeoutRef.current = null;
    }
  };

  const clearTick = () => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  };

  const stop = useCallback(
    async (reason: "timer" | "manual" | "unmount" | "error") => {
      if (endedRef.current) return;
      endedRef.current = true;
      clearTick();
      clearHlsTimeout();
      setStatus(reason === "error" ? "error" : "stopping");
      const id = sessionIdRef.current;
      sessionIdRef.current = null;
      if (id) {
        try {
          await invokeFn("stop", { sessionId: id });
        } catch {
          /* best effort */
        }
      }
      setStatus(reason === "error" ? "error" : "ended");
      onEnded?.(reason);
    },
    [invokeFn, onEnded],
  );

  const failWith = useCallback(
    (code: LivePreviewErrorCode, opts?: { callStop?: boolean }) => {
      setErrorCode(code);
      clearTick();
      clearHlsTimeout();
      canPlayRef.current = false;
      if (opts?.callStop && sessionIdRef.current) {
        void stop("error");
      } else {
        endedRef.current = true;
        setStatus("error");
        onEnded?.("error");
      }
    },
    [onEnded, stop],
  );

  const start = useCallback(async () => {
    if (status === "starting" || status === "playing") return;
    endedRef.current = false;
    canPlayRef.current = false;
    setErrorCode(null);
    setStatus("starting");
    setRemaining(LIVE_PREVIEW_DEFAULT_SECONDS);
    setExtensions(0);
    try {
      const res = await invokeFn("start", { rtspUrl });
      if (res.error || !res.sessionId || !res.hlsUrl) {
        throw new Error(res.error ?? "start_failed");
      }
      sessionIdRef.current = res.sessionId;
      setHlsUrl(res.hlsUrl);
      setStatus("playing");
      clearTick();
      tickRef.current = setInterval(() => {
        setRemaining((r) => {
          if (r <= 1) {
            clearTick();
            void stop("timer");
            return 0;
          }
          return r - 1;
        });
      }, 1000);
      // Watchdog: se o <video> não emitir `canplay` dentro do prazo, marca hls_timeout.
      clearHlsTimeout();
      hlsTimeoutRef.current = setTimeout(() => {
        if (!canPlayRef.current && !endedRef.current) {
          failWith("hls_timeout", { callStop: true });
        }
      }, LIVE_PREVIEW_HLS_TIMEOUT_MS);
    } catch (e) {
      const raw = e instanceof Error ? e.message : "start_failed";
      setErrorCode(raw as LivePreviewErrorCode);
      setStatus("error");
      endedRef.current = true;
      onEnded?.("error");
    }
  }, [failWith, invokeFn, onEnded, rtspUrl, status, stop]);

  const extend = useCallback(async () => {
    if (status !== "playing" || extensions >= LIVE_PREVIEW_MAX_EXTENSIONS) return;
    const id = sessionIdRef.current;
    if (!id) return;
    setStatus("extending");
    try {
      const res = await invokeFn("extend", { sessionId: id, seconds: LIVE_PREVIEW_EXTEND_SECONDS });
      if (res.error) throw new Error(res.error);
      setExtensions((n) => n + 1);
      setRemaining((r) => r + LIVE_PREVIEW_EXTEND_SECONDS);
      setStatus("playing");
      setErrorCode(null);
    } catch (e) {
      const raw = e instanceof Error ? e.message : "extend_failed_client";
      setErrorCode(raw as LivePreviewErrorCode);
      setStatus("playing");
    }
  }, [extensions, invokeFn, status]);

  const handleVideoError = useCallback(() => {
    if (endedRef.current) return;
    failWith("connection_dropped", { callStop: true });
  }, [failWith]);

  const handleVideoCanPlay = useCallback(() => {
    canPlayRef.current = true;
    clearHlsTimeout();
  }, []);

  useEffect(() => {
    if (autoStart) void start();
    return () => {
      clearTick();
      if (!endedRef.current && sessionIdRef.current) {
        endedRef.current = true;
        const id = sessionIdRef.current;
        sessionIdRef.current = null;
        void invokeFn("stop", { sessionId: id }).catch(() => undefined);
        onEnded?.("unmount");
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handler = () => {
      const id = sessionIdRef.current;
      if (!id) return;
      try {
        const url = `${(import.meta.env.VITE_SUPABASE_URL ?? "").replace(/\/$/, "")}/functions/v1/rtsp-preview`;
        const blob = new Blob(
          [JSON.stringify({ action: "stop", sessionId: id })],
          { type: "application/json" },
        );
        if (typeof navigator !== "undefined" && "sendBeacon" in navigator) {
          navigator.sendBeacon(url, blob);
        }
      } catch {
        /* noop */
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  const disabledExtend =
    status !== "playing" || extensions >= LIVE_PREVIEW_MAX_EXTENSIONS;

  return (
    <Card
      className={cn("space-y-3 p-3", className)}
      data-testid="live-preview-player"
      data-status={status}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <PlayCircle className="h-4 w-4 text-primary" aria-hidden />
          Prévia ao vivo
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="gap-1"
            data-testid="live-preview-remaining"
            data-remaining={remaining}
          >
            <Timer className="h-3 w-3" aria-hidden />
            {status === "ended" ? "Encerrada" : `${remaining}s`}
          </Badge>
          {extensions > 0 && (
            <Badge variant="secondary" data-testid="live-preview-extensions">
              +{extensions * LIVE_PREVIEW_EXTEND_SECONDS}s
            </Badge>
          )}
        </div>
      </div>

      <div className="relative aspect-video overflow-hidden rounded-md border bg-black/80">
        {hlsUrl && status === "playing" ? (
          <video
            data-testid="live-preview-video"
            src={hlsUrl}
            className="h-full w-full object-contain"
            autoPlay
            muted
            playsInline
            onError={handleVideoError}
            onCanPlay={handleVideoCanPlay}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center px-3 text-center text-xs text-muted-foreground">
            {status === "starting" && (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Iniciando prévia…
              </span>
            )}
            {status === "idle" && "Clique em Iniciar prévia para visualizar 60s do stream."}
            {status === "ended" && "Prévia encerrada."}
            {status === "error" && (() => {
              const { code, info } = resolveLivePreviewError(errorCode);
              return (
                <div
                  role="alert"
                  className="flex flex-col items-center gap-1 text-destructive"
                  data-testid="live-preview-error"
                  data-error-code={code}
                >
                  <AlertTriangle className="h-5 w-5" aria-hidden />
                  <strong className="text-sm">{info.title}</strong>
                  <span className="text-[11px] leading-snug text-muted-foreground">
                    {info.suggestion}
                  </span>
                </div>
              );
            })()}
          </div>
        )}
      </div>
      {status === "playing" && errorCode && (
        <div
          role="status"
          data-testid="live-preview-warning"
          data-error-code={errorCode}
          className="rounded border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-[11px] text-amber-700 dark:text-amber-300"
        >
          {resolveLivePreviewError(errorCode).info.title} — {resolveLivePreviewError(errorCode).info.suggestion}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-end gap-2">
        {status === "idle" || status === "ended" || status === "error" ? (
          <Button
            type="button"
            size="sm"
            onClick={start}
            data-testid="live-preview-start"
            
          >
            <PlayCircle className="mr-1 h-4 w-4" />
            {status === "ended" || status === "error" ? "Reiniciar prévia" : "Iniciar prévia"}
          </Button>
        ) : (
          <>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={extend}
              disabled={disabledExtend}
              data-testid="live-preview-extend"
              title={
                extensions >= LIVE_PREVIEW_MAX_EXTENSIONS
                  ? "Limite de extensões atingido"
                  : "Adiciona +60s à sessão"
              }
            >
              <RefreshCw className="mr-1 h-4 w-4" />
              Estender +60s
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => void stop("manual")}
              data-testid="live-preview-stop"
            >
              <StopCircle className="mr-1 h-4 w-4" />
              Encerrar
            </Button>
          </>
        )}
      </div>
    </Card>
  );
}

export default LivePreviewPlayer;
