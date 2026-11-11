/**
 * VISÃO — Harness DEV-only para testar o LivePreviewPlayer via Playwright.
 *
 * Renderizado apenas no dev server ou em build com `VITE_E2E_HARNESS=true` (CI de E2E).
 * Expõe hooks em `window.__livePreviewHarness` para orquestrar a suíte E2E:
 *  - `invokeLog`: registro cronológico de chamadas (start/extend/stop).
 *  - `openDialog()` / `closeDialog()`: monta/desmonta o player simulando o AddCameraDialog.
 *  - `setNextStartResult` / `setNextExtendResult`: injeta falhas para cenários adversariais.
 *
 * Nenhum tráfego real de Supabase é executado — o `invoke` é totalmente mockado.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LivePreviewPlayer } from '@/components/cameras/LivePreviewPlayer';

type InvokeAction = 'start' | 'extend' | 'stop';
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
      /** Dispara `error` no <video>, simulando drop de conexão HLS. */
      simulateVideoError: () => boolean;
      reset: () => void;
    };
  }
}

/**
 * Vídeo WebM/VP8 real e mínimo (16x16, preto, 2 s, ~1 KB). O `invoke` mockado
 * devolve um blob: URL dele como `hlsUrl`, para que o <video> do player carregue
 * de verdade (dispara `canplay`, não `error`). Um URL inválido como
 * `blob:mock/hls` fazia o navegador disparar `error` na hora — o player caía em
 * `connection_dropped` e os cenários de "prévia tocando" nunca eram testáveis.
 * blob: é permitido pelo `media-src` da CSP do index.html; data: não é.
 */
const MOCK_VIDEO_WEBM_BASE64 =
  'GkXfo59ChoEBQveBAULygQRC84EIQoKEd2VibUKHgQJChYECGFOAZwEAAAAAAAOfEU2bdLpNu4tTq4QVSalmU6yBoU' +
  '27i1OrhBZUrmtTrIHWTbuMU6uEElTDZ1OsggEnTbuMU6uEHFO7a1OsggOJ7AEAAAAAAABZAAAAAAAAAAAAAAAAAAAA' +
  'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
  'AAAAAAAAAVSalmsCrXsYMPQkBNgIxMYXZmNjEuMS4xMDBXQYxMYXZmNjEuMS4xMDBEiYhAn0AAAAAAABZUrmvMrgEA' +
  'AAAAAABD14EBc8WIp5Y6tlHnF0ScgQAitZyDdW5kiIEAhoVWX1ZQOIOBASPjg4QF9eEA4JSwgRC6gRCagQJVsIhVt4' +
  'ECVbiBAhJUw2f6c3OfY8CAZ8iZRaOHRU5DT0RFUkSHjExhdmY2MS4xLjEwMHNz1WPAi2PFiKeWOrZR5xdEZ8igRaOH' +
  'RU5DT0RFUkSHk0xhdmM2MS4zLjEwMCBsaWJ2cHhnyKFFo4hEVVJBVElPTkSHkzAwOjAwOjAyLjAwMDAwMDAwMAAfQ7' +
  'Z1Qd3ngQCjo4EAAIAQAgCdASoQABAAAEcIhYWIhYSIAgIADA1gAP7/q1CAo5WBAGQAsQEAARAQABgAGFgv9AAIAACj' +
  'lYEAyACxAQABEBAAGAAYWC/0AAgAAKOVgQEsALEBAAEQEAAYABhYL/QACAAAo5WBAZAAsQEAARAQABgAGFgv9AAIAA' +
  'CjlYEB9ACxAQABEBAAGAAYWC/0AAgAAKOVgQJYALEBAAEQEAAYABhYL/QACAAAo5WBArwAsQEAARAQFGAAYWC/0AAg' +
  'AACjlYEDIACxAQABEBAAGAAYWC/0AAgAAKOVgQOEALEBAAEQEAAYABhYL/QACAAAo5WBA+gAsQEAARAQABgAGFgv9A' +
  'AIAACjlYEETACxAQABEBAAGAAYWC/0AAgAAKOVgQSwALEBAAEQEAAYABhYL/QACAAAo5WBBRQAsQEAARAQABgAGFgv' +
  '9AAIAACjlYEFeACxAQABEBAAGAAYWC/0AAgAAKOVgQXcALEBAAEQEAAYABhYL/QACAAAo5WBBkAAsQEAARAQABgAGF' +
  'gv9AAIAACjlYEGpACxAQABEBAAGAAYWC/0AAgAAKOVgQcIALEBAAEQEBRgAGFgv9AAIAAAo5WBB2wAsQEAARAQABgA' +
  'GFgv9AAIAAAcU7trkbuPs4EAt4r3gQHxggGm8IED';

function createMockVideoUrl(): string {
  const bytes = Uint8Array.from(atob(MOCK_VIDEO_WEBM_BASE64), (c) => c.charCodeAt(0));
  return URL.createObjectURL(new Blob([bytes], { type: 'video/webm' }));
}

export default function LivePreviewHarnessPage() {
  const [open, setOpen] = useState(false);
  const invokeLogRef = useRef<InvokeEntry[]>([]);
  const nextStartRef = useRef<Partial<InvokeResult> | null>(null);
  const nextExtendRef = useRef<Partial<InvokeResult> | null>(null);
  const lastReasonRef = useRef<string | null>(null);
  const [, force] = useState(0);
  // Criado no efeito (e não em useMemo) para sobreviver ao ciclo
  // montar→desmontar→montar do StrictMode sem ficar com um URL já revogado.
  const mockVideoUrlRef = useRef<string>('');
  useEffect(() => {
    const url = createMockVideoUrl();
    mockVideoUrlRef.current = url;
    return () => URL.revokeObjectURL(url);
  }, []);

  const invoke = useMemo(
    () =>
      async (action: InvokeAction, payload: Record<string, unknown>): Promise<InvokeResult> => {
        invokeLogRef.current.push({ action, payload, ts: Date.now() });
        force((n) => n + 1);
        // yield a microtask so React commits before Playwright observes
        await Promise.resolve();
        if (action === 'start') {
          const override = nextStartRef.current;
          nextStartRef.current = null;
          if (override)
            return { sessionId: 'sess-mock', hlsUrl: mockVideoUrlRef.current, ...override };
          return { sessionId: 'sess-mock', hlsUrl: mockVideoUrlRef.current };
        }
        if (action === 'extend') {
          const override = nextExtendRef.current;
          nextExtendRef.current = null;
          if (override) return override;
          return {};
        }
        return {};
      },
    []
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
      simulateVideoError: () => {
        const v = document.querySelector<HTMLVideoElement>('[data-testid="live-preview-video"]');
        if (!v) return false;
        v.dispatchEvent(new Event('error'));
        return true;
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
        <Button size="sm" data-testid="harness-open" onClick={() => setOpen(true)} disabled={open}>
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
      <Card className="p-3" data-testid="harness-dialog" data-open={open ? 'true' : 'false'}>
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
          2
        )}
      </pre>
    </div>
  );
}
