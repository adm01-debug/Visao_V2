/**
 * VISÃO — Harness DEV-only para testar o LivePreviewPlayer via Playwright.
 *
 * Renderizado apenas quando `import.meta.env.DEV === true`.
 * Expõe hooks em `window.__livePreviewHarness` para orquestrar a suíte E2E:
 *  - `invokeLog`: registro cronológico de chamadas (start/extend/stop).
 *  - `openDialog()` / `closeDialog()`: monta/desmonta o player simulando o AddCameraDialog.
 *  - `setNextStartResult` / `setNextExtendResult`: injeta falhas para cenários adversariais.
 *
 * Nenhum tráfego real de Supabase é executado — o `invoke` é totalmente mockado.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LivePreviewPlayer } from "@/components/cameras/LivePreviewPlayer";

type InvokeAction = "start" | "extend" | "stop";
type InvokeResult = {
  sessionId?: string;
  hlsUrl?: string;
  expiresAt?: string;
  error?: string;
};
type InvokeEntry = { action: InvokeAction; payload: Record<string, unknown>; ts: number };

declare global {
  interface Window {
    __livePreviewHarness?: {
      invokeLog: InvokeEntry[];
      lastReason: string | null;
      openDialog: () => void;
      closeDialog: () => void;
      setNextStartResult: (r: Partial<InvokeResult>) => void;
      setNextExtendResult: (r: Partial<InvokeResult>) => void;
      reset: () => void;
    };
  }
}

export default function LivePreviewHarnessPage() {
  const [open, setOpen] = useState(false);
  const invokeLogRef = useRef<InvokeEntry[]>([]);
  const nextStartRef = useRef<Partial<InvokeResult> | null>(null);
  const nextExtendRef = useRef<Partial<InvokeResult> | null>(null);
  const lastReasonRef = useRef<string | null>(null);
  const [, force] = useState(0);

  const invoke = useMemo(
    () => async (action: InvokeAction, payload: Record<string, unknown>): Promise<InvokeResult> => {
      invokeLogRef.current.push({ action, payload, ts: Date.now() });
      force((n) => n + 1);
      // yield a microtask so React commits before Playwright observes
      await Promise.resolve();
      if (action === "start") {
        const override = nextStartRef.current;
        nextStartRef.current = null;
        if (override) return { sessionId: "sess-mock", hlsUrl: "blob:mock/hls", ...override };
        return { sessionId: "sess-mock", hlsUrl: "blob:mock/hls" };
      }
      if (action === "extend") {
        const override = nextExtendRef.current;
        nextExtendRef.current = null;
        if (override) return override;
        return {};
      }
      return {};
    },
    [],
  );

  useEffect(() => {
    window.__livePreviewHarness = {
      invokeLog: invokeLogRef.current,
      lastReason: lastReasonRef.current,
      openDialog: () => setOpen(true),
      closeDialog: () => setOpen(false),
      setNextStartResult: (r) => {
        nextStartRef.current = r;
      },
      setNextExtendResult: (r) => {
        nextExtendRef.current = r;
      },
      reset: () => {
        invokeLogRef.current.length = 0;
        lastReasonRef.current = null;
        nextStartRef.current = null;
        nextExtendRef.current = null;
        setOpen(false);
      },
    };
    return () => {
      delete window.__livePreviewHarness;
    };
  }, []);

  // Keep the exposed reference up-to-date after each render.
  if (window.__livePreviewHarness) {
    window.__livePreviewHarness.invokeLog = invokeLogRef.current;
    window.__livePreviewHarness.lastReason = lastReasonRef.current;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-6" data-testid="live-preview-harness">
      <h1 className="text-lg font-semibold">LivePreviewPlayer — Harness (DEV)</h1>
      <div className="flex gap-2">
        <Button
          size="sm"
          data-testid="harness-open"
          onClick={() => setOpen(true)}
          disabled={open}
        >
          Abrir diálogo
        </Button>
        <Button
          size="sm"
          variant="outline"
          data-testid="harness-close"
          onClick={() => setOpen(false)}
          disabled={!open}
        >
          Fechar diálogo
        </Button>
      </div>
      <Card className="p-3" data-testid="harness-dialog" data-open={open ? "true" : "false"}>
        {open ? (
          <LivePreviewPlayer
            rtspUrl="rtsp://user:pass@10.0.0.1:554/stream"
            autoStart={false}
            invoke={invoke}
            onEnded={(reason) => {
              lastReasonRef.current = reason;
              if (window.__livePreviewHarness) {
                window.__livePreviewHarness.lastReason = reason;
              }
              force((n) => n + 1);
            }}
          />
        ) : (
          <p className="text-xs text-muted-foreground">Diálogo fechado.</p>
        )}
      </Card>
      <pre
        data-testid="harness-log"
        className="max-h-64 overflow-auto rounded bg-muted p-2 text-[10px]"
      >
        {JSON.stringify(
          {
            open,
            lastReason: lastReasonRef.current,
            invokeLog: invokeLogRef.current.map((e) => ({ action: e.action })),
          },
          null,
          2,
        )}
      </pre>
    </div>
  );
}
