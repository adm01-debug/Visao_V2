/**
 * Route Prefetch Registry — dispara `import()` das rotas/módulos pesados sob
 * demanda para reduzir tempo de transição sem inflar o bundle inicial.
 *
 * Estratégia:
 *   - `prefetchRoute(path)` executa o `import()` da rota se ainda não foi
 *     resolvido. Vite marca o chunk como `modulepreload` automaticamente
 *     através do `preloadHelper`, warmando também a árvore de dependências
 *     (ex.: `vendor-mapbox` ao prefetch de `/dashboard`).
 *   - Respeita `navigator.connection.saveData` e `effectiveType` — em 2G/slow-2G
 *     ou modo economia de dados, o prefetch é ignorado.
 *   - Cache in-memory garante idempotência (nunca importa o mesmo módulo 2x).
 *   - Warm-set opcional por rota atual (rotas mais prováveis de serem visitadas
 *     em seguida) via `getLikelyNext(currentPath)`.
 *
 * Uso:
 *   - Hover em link: `<PrefetchLink to="/dashboard" />` (ver componente).
 *   - Imperativo: `prefetchRoute("/dashboard")`.
 *   - Idle warmup: `<IdleRoutePrefetcher />` uma vez no App.
 */

type Importer = () => Promise<unknown>;

const seen = new Set<string>();

// Registro central. As chaves batem com os `path` do router — quando adicionar
// rota nova em `App.tsx`, registre aqui para habilitar prefetch inteligente.
const ROUTES: Record<string, Importer> = {
  "/dashboard": () => import("@/pages/DashboardV2"),
  "/cameras": () => import("@/pages/CamerasPage"),
  "/alertas": () => import("@/pages/AlertsPage"),
  "/alerts": () => import("@/pages/AlertsPage"),
  "/zones": () => import("@/pages/ZonesPage"),
  "/recordings": () => import("@/pages/RecordingsPage"),
  "/analytics": () => import("@/pages/AnalyticsPage"),
  "/settings": () => import("@/pages/SettingsPage"),
  "/security": () => import("@/pages/SecurityPage"),
  "/face-recognition": () => import("@/pages/FaceRecognitionPage"),
  "/license-plate": () => import("@/pages/LicensePlatePage"),
  "/heatmap": () => import("@/pages/HeatmapPage"),
  "/reports": () => import("@/pages/ReportsPage"),
  "/ppe": () => import("@/pages/PPEPage"),
  "/people": () => import("@/pages/PeoplePage"),
  "/recognition-logs": () => import("@/pages/RecognitionLogsPage"),
  "/recognition-analytics": () => import("@/pages/RecognitionAnalyticsPage"),
  "/stream-settings": () => import("@/pages/StreamSettingsPage"),
  "/telegram-settings": () => import("@/pages/TelegramSettingsPage"),
  "/notification-settings": () => import("@/pages/NotificationSettingsPage"),
  "/automation-rules": () => import("@/pages/AutomationRulesPage"),
  "/profile": () => import("@/pages/ProfilePage"),
  "/help": () => import("@/pages/HelpPage"),
  "/panic-events": () => import("@/pages/PanicEventsPage"),
  "/productivity": () => import("@/pages/ProductivityDashboardPage"),
  "/behavior-detection": () => import("@/pages/BehaviorDetectionPage"),
  "/journey-reports": () => import("@/pages/JourneyReportsPage"),
  "/collaborator-flow-map": () => import("@/pages/CollaboratorFlowMapPage"),
  "/goals-alerts": () => import("@/pages/GoalsAlertsPage"),
  "/users": () => import("@/pages/UserManagementPage"),
  "/alerts-timeline": () => import("@/pages/AlertsTimelinePage"),
};

// Rotas mais prováveis a partir de cada origem — usadas pelo warmup em idle.
// Manter enxuto: 2-3 destinos por origem para não desperdiçar banda.
const NEXT_ROUTES: Record<string, readonly string[]> = {
  "/auth": ["/dashboard"],
  "/": ["/dashboard", "/alertas"],
  "/dashboard": ["/alertas", "/cameras", "/face-recognition"],
  "/cameras": ["/dashboard", "/recordings", "/face-recognition"],
  "/alertas": ["/dashboard", "/alerts-timeline"],
  "/face-recognition": ["/people", "/recognition-logs"],
  "/people": ["/face-recognition", "/recognition-logs"],
  "/settings": ["/notification-settings", "/stream-settings", "/telegram-settings"],
};

interface NetworkInformation {
  saveData?: boolean;
  effectiveType?: "slow-2g" | "2g" | "3g" | "4g";
}

export function isSlowConnection(): boolean {
  if (typeof navigator === "undefined") return false;
  const c = (navigator as unknown as { connection?: NetworkInformation }).connection;
  if (!c) return false;
  if (c.saveData) return true;
  return c.effectiveType === "slow-2g" || c.effectiveType === "2g";
}

/** Dispara o `import()` uma única vez. Silencia erros de rede — a próxima
 *  navegação real ainda pode fazer o fetch normalmente. */
export function prefetchModule(key: string, importer: Importer): void {
  if (seen.has(key)) return;
  if (isSlowConnection()) return;
  seen.add(key);
  importer().catch(() => {
    // Permite retry numa próxima interação.
    seen.delete(key);
  });
}

export function prefetchRoute(path: string): void {
  const importer = ROUTES[path];
  if (!importer) return;
  prefetchModule(`route:${path}`, importer);
}

export function getLikelyNext(currentPath: string): readonly string[] {
  return NEXT_ROUTES[currentPath] ?? [];
}

export function hasRoutePrefetch(path: string): boolean {
  return path in ROUTES;
}
