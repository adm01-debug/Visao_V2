/**
 * Performance Metrics — Web Vitals + chunk load timing.
 *
 * - Coleta CLS, LCP, INP, FCP, TTFB via `web-vitals` v3 (INP substitui FID).
 * - Observa `PerformanceResourceTiming` para chunks JS/CSS (dispara em toda
 *   navegação lazy — permite detectar regressões de bundle e tempo até
 *   renderizar features pesadas como vendor-ml, vendor-mapbox, vendor-pdf).
 * - Sinks: console (DEV), ring-buffer em `localStorage`, e `navigator.sendBeacon`
 *   opcional se `VITE_PERF_METRICS_ENDPOINT` estiver definido.
 * - `window.__perf.dump()` imprime tabela agregada em qualquer ambiente.
 *
 * Uso: chame `startPerfMetrics()` uma vez no bootstrap (main.tsx).
 * Para medir tempo até uma feature pesada renderizar, use `markFeatureReady("CameraMap")`
 * ou o hook `useFeatureReadyMark("FaceRecognition")`.
 */

type MetricKind = "web-vital" | "chunk" | "feature";

export interface PerfMetric {
  kind: MetricKind;
  name: string;
  value: number; // ms (ou score adimensional p/ CLS)
  detail?: Record<string, unknown>;
  ts: number;
}

const STORAGE_KEY = "__perf_metrics_v1";
const RING_MAX = 200;
const CHUNK_PATTERNS = [
  /vendor-ml/,
  /vendor-mapbox/,
  /vendor-pdf/,
  /vendor-hls/,
  /vendor-charts/,
  /vendor-radix/,
  /vendor-react/,
  /vendor-supabase/,
  /vendor-motion/,
  /vendor-date-fns/,
  /vendor-icons/,
  /vendor-query/,
  /CameraMap/,
  /FaceRecognition/,
  /useFaceAPI/,
  /useMLModels/,
];

const isBrowser = typeof window !== "undefined";
const isDev = import.meta.env.DEV;
const endpoint = (import.meta.env.VITE_PERF_METRICS_ENDPOINT as string | undefined) ?? "";

const buffer: PerfMetric[] = [];
let started = false;

function persist(m: PerfMetric): void {
  if (!isBrowser) return;
  buffer.push(m);
  if (buffer.length > RING_MAX) buffer.shift();
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(buffer.slice(-RING_MAX)));
  } catch {
    /* quota — silencioso */
  }
}

function beacon(m: PerfMetric): void {
  if (!endpoint || !isBrowser || !("sendBeacon" in navigator)) return;
  try {
    const blob = new Blob([JSON.stringify(m)], { type: "application/json" });
    navigator.sendBeacon(endpoint, blob);
  } catch {
    /* rede — silencioso */
  }
}

function report(m: PerfMetric): void {
  persist(m);
  beacon(m);
  if (isDev) {
    const v = m.kind === "web-vital" && m.name === "CLS" ? m.value.toFixed(3) : `${m.value.toFixed(0)}ms`;
    // eslint-disable-next-line no-console
    console.debug(`[perf] ${m.kind}:${m.name} = ${v}`, m.detail ?? "");
  }
}

function observeChunks(): void {
  if (!isBrowser || typeof PerformanceObserver === "undefined") return;
  try {
    const po = new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        if (e.entryType !== "resource") continue;
        const r = e as PerformanceResourceTiming;
        const url = r.name;
        if (!/\.(m?js|css)(\?|$)/.test(url)) continue;
        const file = url.split("/").pop() ?? url;
        if (!CHUNK_PATTERNS.some((re) => re.test(file))) continue;
        report({
          kind: "chunk",
          name: file,
          value: r.duration,
          detail: {
            transferSize: r.transferSize,
            encodedBodySize: r.encodedBodySize,
            decodedBodySize: r.decodedBodySize,
            initiatorType: r.initiatorType,
            startTime: Math.round(r.startTime),
          },
          ts: Date.now(),
        });
      }
    });
    po.observe({ type: "resource", buffered: true });
  } catch {
    /* browser sem suporte — silencioso */
  }
}

async function observeWebVitals(): Promise<void> {
  try {
    const { onCLS, onLCP, onINP, onFCP, onTTFB } = await import("web-vitals");
    const emit = (name: string) => (m: { value: number; id: string; rating?: string; navigationType?: string }) => {
      report({
        kind: "web-vital",
        name,
        value: m.value,
        detail: { id: m.id, rating: m.rating, navigationType: m.navigationType },
        ts: Date.now(),
      });
    };
    onCLS(emit("CLS"));
    onLCP(emit("LCP"));
    onINP(emit("INP"));
    onFCP(emit("FCP"));
    onTTFB(emit("TTFB"));
  } catch {
    /* web-vitals ausente — silencioso */
  }
}

export function markFeatureReady(name: string, detail?: Record<string, unknown>): void {
  if (!isBrowser) return;
  const now = performance.now();
  report({ kind: "feature", name, value: now, detail: { ...detail, since: "navigationStart" }, ts: Date.now() });
}

export function getPerfBuffer(): readonly PerfMetric[] {
  return buffer;
}

export function dumpPerfMetrics(): void {
  if (!isBrowser) return;
  const rows = buffer.map((m) => ({
    kind: m.kind,
    name: m.name,
    value: m.kind === "web-vital" && m.name === "CLS" ? m.value.toFixed(3) : `${m.value.toFixed(0)}ms`,
    ts: new Date(m.ts).toISOString(),
  }));
  // eslint-disable-next-line no-console
  console.table(rows);
}

export function startPerfMetrics(): void {
  if (!isBrowser || started) return;
  started = true;
  observeChunks();
  void observeWebVitals();
  // Expor helpers globais para inspeção manual (DevTools).
  (window as unknown as { __perf: unknown }).__perf = {
    dump: dumpPerfMetrics,
    buffer: getPerfBuffer,
    markFeatureReady,
  };
}
