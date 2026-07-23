/// <reference types="vite/client" />

// Contrato de variáveis de ambiente expostas ao bundle (prefixo VITE_).
// Mantido em sincronia com o uso real em src/ e com os .env* pelo gate
// scripts/check-env-contract.mjs (streaming MediaMTX + Supabase).
interface ImportMetaEnv {
  // Supabase (contrato de runtime)
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY: string;
  readonly VITE_SUPABASE_PROJECT_ID: string;

  // MediaMTX — streaming (os 3 nomes que useMediaMTX.ts lê)
  readonly VITE_MEDIAMTX_HLS_URL: string;
  readonly VITE_MEDIAMTX_WEBRTC_URL: string;
  readonly VITE_MEDIAMTX_RTSP_URL: string;

  // App / infraestrutura
  readonly VITE_API_URL: string;
  readonly VITE_SENTRY_DSN: string;
  readonly VITE_ENABLE_ANALYTICS: string;
  readonly VITE_ENABLED_FEATURES: string;
  readonly VITE_PERF_METRICS_ENDPOINT: string;
  readonly VITE_COVERAGE_HTML_ARTIFACTS_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
