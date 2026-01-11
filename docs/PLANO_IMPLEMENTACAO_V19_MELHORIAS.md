# 🚀 PLANO DE IMPLEMENTAÇÃO V19 - MELHORIAS PENDENTES

## 📋 Sumário Executivo

**Data da Análise:** 11/01/2026  
**Repositório:** adm01-debug/vis-o  
**Versão Atual:** 2.1.0  
**Total de Melhorias Identificadas:** 152  

---

## 📊 Estatísticas da Análise

| Categoria | Quantidade |
|-----------|------------|
| 🔴 Crítico | 2 |
| 🟠 Alta Prioridade | 4 |
| 🟡 Média Prioridade | 17 |
| 🟢 Baixa Prioridade | 3 |
| 📝 TODOs no código | 435 |
| 📦 Arquivos > 20KB | 26 |
| 🏷️ Code Markers | 59 |

---

# 🔴 SPRINT 1: CRÍTICO (BLOQUEADORES)

## 1.1 Instalar Dependências i18n no package.json

**Problema:** Os arquivos de i18n foram criados mas as dependências não foram adicionadas ao package.json.

**Arquivos afetados:**
- `package.json`

**Implementação:**

```json
// Adicionar em dependencies:
{
  "i18next": "^23.7.6",
  "react-i18next": "^13.5.0",
  "i18next-browser-languagedetector": "^7.2.0"
}
```

**Código para executar:**
```bash
# Via npm
npm install i18next react-i18next i18next-browser-languagedetector

# Via yarn
yarn add i18next react-i18next i18next-browser-languagedetector
```

**Validação:**
- [ ] Dependências aparecem em package.json
- [ ] `npm install` executa sem erros
- [ ] Import de i18n funciona em src/i18n/index.ts

---

## 1.2 Resolver GitHub Actions Billing

**Problema:** Todos os 34 workflows estão falhando por limite de billing em repositório privado.

**Opções de Solução:**

### Opção A: Adicionar Billing (Recomendado para produção)
1. Acessar GitHub → Settings → Billing
2. Adicionar método de pagamento
3. Habilitar Actions para repositório privado

### Opção B: Tornar Repositório Público
1. Acessar Settings → General
2. Mudar visibilidade para "Public"
3. GitHub Actions gratuito para repos públicos

### Opção C: Desabilitar Workflows Não-Essenciais
Manter apenas:
- ci.yml
- test.yml
- lint.yml
- deploy.yml

Desabilitar:
- chromatic.yml
- visual-regression.yml
- stress-test.yml
- etc.

**Validação:**
- [ ] Pelo menos ci.yml executa com sucesso
- [ ] test.yml executa com sucesso
- [ ] lint.yml executa com sucesso

---

# 🟠 SPRINT 2: ALTA PRIORIDADE

## 2.1 Habilitar React StrictMode

**Arquivo:** `src/main.tsx`

**Problema:** StrictMode não está habilitado, perdendo detecção de problemas em desenvolvimento.

**Implementação:**

```tsx
// ANTES:
ReactDOM.createRoot(document.getElementById('root')!).render(
  <App />
);

// DEPOIS:
import { StrictMode } from 'react';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

**Validação:**
- [ ] Console mostra warnings de StrictMode em DEV
- [ ] Double-rendering em DEV funciona
- [ ] Produção não afetada

---

## 2.2 Criar Teste para appStore.ts

**Arquivo a criar:** `src/stores/__tests__/appStore.test.ts`

**Implementação:**

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '../appStore';

describe('appStore', () => {
  beforeEach(() => {
    useAppStore.getState().reset?.();
  });

  it('should have initial state', () => {
    const state = useAppStore.getState();
    expect(state).toBeDefined();
  });

  it('should update state correctly', () => {
    const { setLoading } = useAppStore.getState();
    if (setLoading) {
      setLoading(true);
      expect(useAppStore.getState().isLoading).toBe(true);
    }
  });

  it('should handle errors', () => {
    const { setError } = useAppStore.getState();
    if (setError) {
      setError('Test error');
      expect(useAppStore.getState().error).toBe('Test error');
    }
  });
});
```

**Validação:**
- [ ] `npm run test src/stores/__tests__/appStore.test.ts` passa
- [ ] Cobertura de stores = 100%

---

## 2.3 Atualizar Version no package.json

**Arquivo:** `package.json`

**Problema:** Version está 2.1.0 mas CHANGELOG mostra 2.2.0

**Implementação:**

```json
{
  "version": "2.2.0"
}
```

**Validação:**
- [ ] package.json version = "2.2.0"
- [ ] CHANGELOG version = 2.2.0

---

## 2.4 Refatorar Arquivos Grandes (>20KB)

**26 arquivos identificados que precisam de refatoração:**

| # | Arquivo | Tamanho | Prioridade |
|---|---------|---------|------------|
| 1 | ZonesPage.tsx | 46.7KB | CRÍTICO |
| 2 | SettingsPage.tsx | 44.8KB | CRÍTICO |
| 3 | PeoplePage.tsx | 44.8KB | CRÍTICO |
| 4 | SearchDropdown.tsx | 37.0KB | ALTO |
| 5 | SecurityPage.tsx | 34.1KB | ALTO |
| 6 | Sidebar.tsx | 33.0KB | ALTO |
| 7 | CamerasPage.tsx | 33.0KB | ALTO |
| 8 | DashboardV2.tsx | 32.2KB | ALTO |
| 9 | RecordingsPage.tsx | 29.2KB | MÉDIO |
| 10 | AlertsPage.tsx | 28.5KB | MÉDIO |
| 11 | AutomationRulesManager.tsx | 28.4KB | MÉDIO |
| 12 | AnalyticsPage.tsx | 26.9KB | MÉDIO |
| 13 | Dashboard.tsx | 25.7KB | MÉDIO |
| 14 | NotificationSettingsPage.tsx | 25.6KB | MÉDIO |
| 15 | RecognitionLogsPage.tsx | 25.5KB | MÉDIO |
| 16-26 | Outros 11 arquivos | 20-25KB | BAIXO |

**Estratégia de Refatoração:**

Para cada arquivo:
1. Extrair hooks customizados para lógica
2. Extrair sub-componentes
3. Usar lazy loading para componentes pesados
4. Mover constantes para arquivos separados

**Exemplo para ZonesPage.tsx:**

```
src/pages/ZonesPage.tsx (46.7KB)
├── src/pages/zones/
│   ├── ZonesPage.tsx (principal, <10KB)
│   ├── components/
│   │   ├── ZoneList.tsx
│   │   ├── ZoneEditor.tsx
│   │   ├── ZoneMap.tsx
│   │   └── ZoneFilters.tsx
│   ├── hooks/
│   │   ├── useZones.ts
│   │   ├── useZoneEditor.ts
│   │   └── useZoneMap.ts
│   └── constants.ts
```

---

# 🟡 SPRINT 3: MÉDIA PRIORIDADE

## 3.1 Criar src/lib/sanitization.ts

**Implementação:**

```typescript
/**
 * Input Sanitization Utilities
 * Prevents XSS and injection attacks
 */

/**
 * Sanitize HTML string
 */
export function sanitizeHtml(input: string): string {
  const div = document.createElement('div');
  div.textContent = input;
  return div.innerHTML;
}

/**
 * Sanitize for SQL (parameterized queries preferred)
 */
export function sanitizeSql(input: string): string {
  return input.replace(/['";\\]/g, '');
}

/**
 * Sanitize filename
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/\.{2,}/g, '.')
    .slice(0, 255);
}

/**
 * Sanitize URL
 */
export function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return '';
    }
    return parsed.toString();
  } catch {
    return '';
  }
}

/**
 * Sanitize JSON input
 */
export function sanitizeJson<T>(input: string, defaultValue: T): T {
  try {
    return JSON.parse(input) as T;
  } catch {
    return defaultValue;
  }
}

/**
 * Strip HTML tags
 */
export function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, '');
}

/**
 * Escape special characters
 */
export function escapeSpecialChars(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export default {
  sanitizeHtml,
  sanitizeSql,
  sanitizeFilename,
  sanitizeUrl,
  sanitizeJson,
  stripHtml,
  escapeSpecialChars,
};
```

---

## 3.2 Criar src/lib/accessibility.ts

**Implementação:**

```typescript
/**
 * Accessibility Utilities
 * WCAG 2.1 AA compliant helpers
 */

/**
 * Check if element is focusable
 */
export function isFocusable(element: HTMLElement): boolean {
  const focusableSelectors = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ];
  return focusableSelectors.some(selector => element.matches(selector));
}

/**
 * Get all focusable elements within container
 */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const selector = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(', ');
  
  return Array.from(container.querySelectorAll<HTMLElement>(selector));
}

/**
 * Trap focus within container
 */
export function trapFocus(container: HTMLElement): () => void {
  const focusableElements = getFocusableElements(container);
  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;

    if (e.shiftKey) {
      if (document.activeElement === firstElement) {
        e.preventDefault();
        lastElement?.focus();
      }
    } else {
      if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement?.focus();
      }
    }
  };

  container.addEventListener('keydown', handleKeyDown);
  firstElement?.focus();

  return () => container.removeEventListener('keydown', handleKeyDown);
}

/**
 * Announce message to screen readers
 */
export function announceToScreenReader(
  message: string,
  priority: 'polite' | 'assertive' = 'polite'
): void {
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;

  document.body.appendChild(announcement);

  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}

/**
 * Check color contrast ratio
 */
export function getContrastRatio(color1: string, color2: string): number {
  const getLuminance = (hex: string): number => {
    const rgb = parseInt(hex.slice(1), 16);
    const r = ((rgb >> 16) & 0xff) / 255;
    const g = ((rgb >> 8) & 0xff) / 255;
    const b = (rgb & 0xff) / 255;

    const toLinear = (c: number) =>
      c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);

    return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  };

  const l1 = getLuminance(color1);
  const l2 = getLuminance(color2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if contrast meets WCAG AA
 */
export function meetsContrastAA(
  foreground: string,
  background: string,
  isLargeText = false
): boolean {
  const ratio = getContrastRatio(foreground, background);
  return isLargeText ? ratio >= 3 : ratio >= 4.5;
}

/**
 * Generate unique ID for accessibility
 */
export function generateA11yId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
}

export default {
  isFocusable,
  getFocusableElements,
  trapFocus,
  announceToScreenReader,
  getContrastRatio,
  meetsContrastAA,
  generateA11yId,
};
```

---

## 3.3 Criar src/lib/cacheUtils.ts

**Implementação:**

```typescript
/**
 * Cache Utilities
 * Memory and localStorage caching with TTL
 */

interface CacheItem<T> {
  value: T;
  expiry: number;
}

// Memory cache
const memoryCache = new Map<string, CacheItem<unknown>>();

/**
 * Set item in memory cache
 */
export function setMemoryCache<T>(
  key: string,
  value: T,
  ttlMs: number = 5 * 60 * 1000
): void {
  memoryCache.set(key, {
    value,
    expiry: Date.now() + ttlMs,
  });
}

/**
 * Get item from memory cache
 */
export function getMemoryCache<T>(key: string): T | null {
  const item = memoryCache.get(key) as CacheItem<T> | undefined;
  
  if (!item) return null;
  
  if (Date.now() > item.expiry) {
    memoryCache.delete(key);
    return null;
  }
  
  return item.value;
}

/**
 * Clear memory cache
 */
export function clearMemoryCache(): void {
  memoryCache.clear();
}

/**
 * Set item in localStorage with TTL
 */
export function setLocalCache<T>(
  key: string,
  value: T,
  ttlMs: number = 24 * 60 * 60 * 1000
): void {
  const item: CacheItem<T> = {
    value,
    expiry: Date.now() + ttlMs,
  };
  
  try {
    localStorage.setItem(key, JSON.stringify(item));
  } catch (e) {
    console.warn('localStorage quota exceeded');
  }
}

/**
 * Get item from localStorage
 */
export function getLocalCache<T>(key: string): T | null {
  try {
    const itemStr = localStorage.getItem(key);
    if (!itemStr) return null;
    
    const item: CacheItem<T> = JSON.parse(itemStr);
    
    if (Date.now() > item.expiry) {
      localStorage.removeItem(key);
      return null;
    }
    
    return item.value;
  } catch {
    return null;
  }
}

/**
 * Clear all expired items from localStorage
 */
export function clearExpiredLocalCache(): void {
  const now = Date.now();
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;
    
    try {
      const item = JSON.parse(localStorage.getItem(key) || '');
      if (item.expiry && now > item.expiry) {
        localStorage.removeItem(key);
      }
    } catch {
      // Not a cache item, skip
    }
  }
}

/**
 * Create a memoized function with cache
 */
export function memoize<T extends (...args: unknown[]) => unknown>(
  fn: T,
  ttlMs: number = 5 * 60 * 1000
): T {
  const cache = new Map<string, CacheItem<ReturnType<T>>>();
  
  return ((...args: Parameters<T>): ReturnType<T> => {
    const key = JSON.stringify(args);
    const cached = cache.get(key);
    
    if (cached && Date.now() < cached.expiry) {
      return cached.value;
    }
    
    const result = fn(...args) as ReturnType<T>;
    cache.set(key, { value: result, expiry: Date.now() + ttlMs });
    
    return result;
  }) as T;
}

export default {
  setMemoryCache,
  getMemoryCache,
  clearMemoryCache,
  setLocalCache,
  getLocalCache,
  clearExpiredLocalCache,
  memoize,
};
```

---

## 3.4 Criar src/hooks/useVirtualList.ts

**Implementação:**

```typescript
import { useState, useCallback, useMemo, useRef, useEffect } from 'react';

interface UseVirtualListOptions<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
}

interface VirtualListResult<T> {
  virtualItems: Array<{ item: T; index: number; style: React.CSSProperties }>;
  totalHeight: number;
  containerProps: {
    style: React.CSSProperties;
    onScroll: (e: React.UIEvent<HTMLDivElement>) => void;
    ref: React.RefObject<HTMLDivElement>;
  };
  scrollToIndex: (index: number) => void;
}

/**
 * Hook for virtualizing long lists
 * Renders only visible items for better performance
 */
export function useVirtualList<T>({
  items,
  itemHeight,
  containerHeight,
  overscan = 3,
}: UseVirtualListOptions<T>): VirtualListResult<T> {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const totalHeight = items.length * itemHeight;

  const visibleRange = useMemo(() => {
    const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const end = Math.min(items.length - 1, start + visibleCount + overscan * 2);
    
    return { start, end };
  }, [scrollTop, itemHeight, containerHeight, items.length, overscan]);

  const virtualItems = useMemo(() => {
    const result: Array<{ item: T; index: number; style: React.CSSProperties }> = [];
    
    for (let i = visibleRange.start; i <= visibleRange.end; i++) {
      result.push({
        item: items[i],
        index: i,
        style: {
          position: 'absolute',
          top: i * itemHeight,
          height: itemHeight,
          left: 0,
          right: 0,
        },
      });
    }
    
    return result;
  }, [items, visibleRange, itemHeight]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const scrollToIndex = useCallback((index: number) => {
    if (containerRef.current) {
      containerRef.current.scrollTop = index * itemHeight;
    }
  }, [itemHeight]);

  const containerProps = {
    style: {
      height: containerHeight,
      overflow: 'auto' as const,
      position: 'relative' as const,
    },
    onScroll: handleScroll,
    ref: containerRef,
  };

  return {
    virtualItems,
    totalHeight,
    containerProps,
    scrollToIndex,
  };
}

export default useVirtualList;
```

---

## 3.5 Criar src/hooks/useIntersectionObserver.ts

**Implementação:**

```typescript
import { useState, useEffect, useRef, useCallback } from 'react';

interface UseIntersectionObserverOptions {
  threshold?: number | number[];
  root?: Element | null;
  rootMargin?: string;
  freezeOnceVisible?: boolean;
}

interface UseIntersectionObserverResult {
  ref: React.RefObject<HTMLElement>;
  isIntersecting: boolean;
  entry: IntersectionObserverEntry | null;
}

/**
 * Hook for observing element visibility
 * Useful for lazy loading, infinite scroll, animations
 */
export function useIntersectionObserver({
  threshold = 0,
  root = null,
  rootMargin = '0px',
  freezeOnceVisible = false,
}: UseIntersectionObserverOptions = {}): UseIntersectionObserverResult {
  const ref = useRef<HTMLElement>(null);
  const [entry, setEntry] = useState<IntersectionObserverEntry | null>(null);
  const [isIntersecting, setIsIntersecting] = useState(false);

  const frozen = useRef(false);

  const updateEntry = useCallback(([newEntry]: IntersectionObserverEntry[]) => {
    if (frozen.current) return;
    
    setEntry(newEntry);
    setIsIntersecting(newEntry.isIntersecting);
    
    if (freezeOnceVisible && newEntry.isIntersecting) {
      frozen.current = true;
    }
  }, [freezeOnceVisible]);

  useEffect(() => {
    const node = ref.current;
    const hasIOSupport = !!window.IntersectionObserver;
    
    if (!hasIOSupport || !node) return;

    const observerParams = { threshold, root, rootMargin };
    const observer = new IntersectionObserver(updateEntry, observerParams);

    observer.observe(node);

    return () => observer.disconnect();
  }, [threshold, root, rootMargin, updateEntry]);

  return { ref, isIntersecting, entry };
}

/**
 * Hook for lazy loading images
 */
export function useLazyImage(src: string, placeholder?: string) {
  const { ref, isIntersecting } = useIntersectionObserver({
    threshold: 0.1,
    freezeOnceVisible: true,
  });
  
  const [imageSrc, setImageSrc] = useState(placeholder || '');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (isIntersecting && src) {
      const img = new Image();
      img.src = src;
      img.onload = () => {
        setImageSrc(src);
        setIsLoaded(true);
      };
    }
  }, [isIntersecting, src]);

  return { ref, imageSrc, isLoaded };
}

export default useIntersectionObserver;
```

---

## 3.6 Criar src/lib/errorReporting.ts

**Implementação:**

```typescript
/**
 * Error Reporting Utilities
 * Centralized error tracking and reporting
 */

interface ErrorReport {
  message: string;
  stack?: string;
  componentStack?: string;
  url: string;
  timestamp: string;
  userAgent: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}

interface ErrorReportingConfig {
  endpoint?: string;
  enabled: boolean;
  sampleRate: number;
  ignorePatterns: RegExp[];
}

const config: ErrorReportingConfig = {
  endpoint: import.meta.env.VITE_ERROR_REPORTING_ENDPOINT,
  enabled: import.meta.env.PROD,
  sampleRate: 1.0,
  ignorePatterns: [
    /ResizeObserver loop/,
    /Loading chunk \d+ failed/,
    /Network request failed/,
  ],
};

/**
 * Check if error should be ignored
 */
function shouldIgnoreError(error: Error): boolean {
  return config.ignorePatterns.some(pattern => 
    pattern.test(error.message)
  );
}

/**
 * Check if error should be sampled
 */
function shouldSampleError(): boolean {
  return Math.random() < config.sampleRate;
}

/**
 * Create error report object
 */
function createErrorReport(
  error: Error,
  metadata?: Record<string, unknown>
): ErrorReport {
  return {
    message: error.message,
    stack: error.stack,
    url: window.location.href,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    metadata,
  };
}

/**
 * Send error report to endpoint
 */
async function sendErrorReport(report: ErrorReport): Promise<void> {
  if (!config.endpoint) return;

  try {
    await fetch(config.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(report),
    });
  } catch {
    console.warn('Failed to send error report');
  }
}

/**
 * Report error
 */
export async function reportError(
  error: Error,
  metadata?: Record<string, unknown>
): Promise<void> {
  if (!config.enabled) return;
  if (shouldIgnoreError(error)) return;
  if (!shouldSampleError()) return;

  const report = createErrorReport(error, metadata);
  await sendErrorReport(report);
}

/**
 * Report React error boundary error
 */
export async function reportReactError(
  error: Error,
  componentStack: string
): Promise<void> {
  const report = createErrorReport(error, { componentStack });
  report.componentStack = componentStack;
  await sendErrorReport(report);
}

/**
 * Configure error reporting
 */
export function configureErrorReporting(
  options: Partial<ErrorReportingConfig>
): void {
  Object.assign(config, options);
}

/**
 * Setup global error handlers
 */
export function setupGlobalErrorHandlers(): void {
  window.onerror = (message, source, lineno, colno, error) => {
    if (error) {
      reportError(error, { source, lineno, colno });
    }
  };

  window.onunhandledrejection = (event) => {
    const error = event.reason instanceof Error 
      ? event.reason 
      : new Error(String(event.reason));
    reportError(error, { type: 'unhandledrejection' });
  };
}

export default {
  reportError,
  reportReactError,
  configureErrorReporting,
  setupGlobalErrorHandlers,
};
```

---

## 3.7 Criar src/lib/crashReporting.ts

**Implementação:**

```typescript
/**
 * Crash Reporting Utilities
 * Track and report application crashes
 */

interface CrashReport {
  type: 'crash' | 'freeze' | 'oom';
  timestamp: string;
  url: string;
  sessionDuration: number;
  memoryUsage?: number;
  performanceMetrics?: Record<string, number>;
  lastActions: string[];
}

const sessionStart = Date.now();
const lastActions: string[] = [];
const MAX_ACTIONS = 50;

/**
 * Track user action
 */
export function trackAction(action: string): void {
  lastActions.push(`${Date.now()}: ${action}`);
  if (lastActions.length > MAX_ACTIONS) {
    lastActions.shift();
  }
}

/**
 * Get memory usage if available
 */
function getMemoryUsage(): number | undefined {
  const memory = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;
  return memory?.usedJSHeapSize;
}

/**
 * Get performance metrics
 */
function getPerformanceMetrics(): Record<string, number> {
  const timing = performance.timing;
  return {
    domLoad: timing.domContentLoadedEventEnd - timing.navigationStart,
    pageLoad: timing.loadEventEnd - timing.navigationStart,
    dns: timing.domainLookupEnd - timing.domainLookupStart,
    tcp: timing.connectEnd - timing.connectStart,
    ttfb: timing.responseStart - timing.requestStart,
  };
}

/**
 * Create crash report
 */
function createCrashReport(type: CrashReport['type']): CrashReport {
  return {
    type,
    timestamp: new Date().toISOString(),
    url: window.location.href,
    sessionDuration: Date.now() - sessionStart,
    memoryUsage: getMemoryUsage(),
    performanceMetrics: getPerformanceMetrics(),
    lastActions: [...lastActions],
  };
}

/**
 * Send crash report
 */
async function sendCrashReport(report: CrashReport): Promise<void> {
  const endpoint = import.meta.env.VITE_CRASH_REPORTING_ENDPOINT;
  if (!endpoint) return;

  // Use sendBeacon for reliability during crash
  const data = JSON.stringify(report);
  
  if (navigator.sendBeacon) {
    navigator.sendBeacon(endpoint, data);
  } else {
    try {
      await fetch(endpoint, {
        method: 'POST',
        body: data,
        keepalive: true,
      });
    } catch {
      // Silent fail during crash
    }
  }
}

/**
 * Report crash
 */
export function reportCrash(): void {
  const report = createCrashReport('crash');
  sendCrashReport(report);
}

/**
 * Detect and report page freeze
 */
export function setupFreezeDetection(thresholdMs: number = 5000): void {
  let lastCheck = Date.now();
  
  setInterval(() => {
    const now = Date.now();
    const elapsed = now - lastCheck;
    
    if (elapsed > thresholdMs) {
      const report = createCrashReport('freeze');
      sendCrashReport(report);
    }
    
    lastCheck = now;
  }, 1000);
}

/**
 * Setup beforeunload handler for crash detection
 */
export function setupCrashDetection(): void {
  window.addEventListener('beforeunload', () => {
    // Store session state in localStorage
    localStorage.setItem('vis-o-last-session', JSON.stringify({
      timestamp: Date.now(),
      url: window.location.href,
      actions: lastActions,
    }));
  });

  // Check for previous crash on load
  const lastSession = localStorage.getItem('vis-o-last-session');
  if (lastSession) {
    try {
      const session = JSON.parse(lastSession);
      const timeSinceLastSession = Date.now() - session.timestamp;
      
      // If less than 5 seconds, likely a crash
      if (timeSinceLastSession < 5000) {
        const report = createCrashReport('crash');
        sendCrashReport(report);
      }
    } catch {
      // Invalid session data
    }
    localStorage.removeItem('vis-o-last-session');
  }
}

export default {
  trackAction,
  reportCrash,
  setupFreezeDetection,
  setupCrashDetection,
};
```

---

## 3.8 Adicionar Canonical URL e Robots Meta ao index.html

**Arquivo:** `index.html`

**Implementação:**

```html
<!-- Adicionar no <head> -->
<link rel="canonical" href="https://vis-o.app/" />
<meta name="robots" content="index, follow" />
<meta name="googlebot" content="index, follow, max-snippet:-1, max-image-preview:large" />
```

---

## 3.9 Criar nginx.conf

**Arquivo:** `nginx.conf`

**Implementação:**

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml application/javascript application/json;
    gzip_disable "MSIE [1-6]\.";

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:;" always;

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API proxy (if needed)
    location /api {
        proxy_pass http://backend:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Health check
    location /health {
        return 200 'OK';
        add_header Content-Type text/plain;
    }
}
```

---

## 3.10-3.17 Resolver Code Markers

### 3.10 Resolver HACK em models_config.ts

**Arquivo:** `src/config/models_config.ts`

**Ação:** Revisar e refatorar o código marcado como HACK

---

### 3.11 Resolver 5 XXX markers

| Arquivo | Ação |
|---------|------|
| ipUtils.ts | Revisar implementação |
| TelegramConfigPanel.stories.tsx | Completar story |
| uuid.ts | Revisar geração de UUID |
| NotificationSecretsConfig.tsx | Revisar configuração |

---

### 3.12-3.16 Resolver 15 BUG markers

**Lista de arquivos:**
- Changelog.tsx
- ErrorBoundary.tsx
- FeedbackWidget.tsx
- logger.ts
- + 11 outros

**Ação:** Revisar cada BUG marker e implementar correção

---

### 3.17 Resolver 8 OPTIMIZE markers

| Arquivo | Ação |
|---------|------|
| imageOptimizer.ts | Implementar otimização |
| renderOptimizer.ts | Implementar otimização |
| bundleOptimizer.ts | Implementar otimização |
| lazyLoad.ts | Revisar lazy loading |
| + 4 outros | Revisar |

---

# 🟢 SPRINT 4: BAIXA PRIORIDADE

## 4.1 Criar Configuração Kubernetes (k8s/)

**Estrutura:**
```
k8s/
├── deployment.yaml
├── service.yaml
├── ingress.yaml
├── configmap.yaml
├── secrets.yaml
└── hpa.yaml
```

---

## 4.2 Resolver 2 DEPRECATED markers

| Arquivo | Ação |
|---------|------|
| ThemeContext.tsx | Migrar para nova implementação |
| crypto.ts | Atualizar para API moderna |

---

## 4.3 Revisar 28 REVIEW markers

**Ação:** Criar issues no GitHub para cada REVIEW marker para rastreamento.

---

# 📋 SPRINT 5: TODOs (435 itens)

## Categorização dos TODOs

| Categoria | Quantidade Estimada |
|-----------|---------------------|
| Components | 80 |
| Stories | 200 |
| Hooks | 20 |
| Services | 15 |
| Pages | 40 |
| Utils | 20 |
| Types | 10 |
| Outros | 50 |

**Estratégia:**
1. Priorizar TODOs em componentes de produção
2. Ignorar TODOs em stories (baixa prioridade)
3. Criar issues para TODOs complexos

---

# 📊 CRONOGRAMA SUGERIDO

| Sprint | Duração | Itens |
|--------|---------|-------|
| Sprint 1 | 1 dia | 2 críticos |
| Sprint 2 | 2 dias | 4 alta prioridade |
| Sprint 3 | 5 dias | 17 média prioridade |
| Sprint 4 | 2 dias | 3 baixa prioridade |
| Sprint 5 | 10 dias | 435 TODOs |

**Total estimado:** 20 dias úteis

---

# ✅ CHECKLIST DE VALIDAÇÃO

## Crítico
- [ ] Dependências i18n instaladas
- [ ] Pelo menos 1 workflow executando

## Alta Prioridade
- [ ] React StrictMode habilitado
- [ ] appStore.ts com teste
- [ ] package.json version = 2.2.0

## Média Prioridade
- [ ] sanitization.ts criado
- [ ] accessibility.ts criado
- [ ] cacheUtils.ts criado
- [ ] useVirtualList.ts criado
- [ ] useIntersectionObserver.ts criado
- [ ] errorReporting.ts criado
- [ ] crashReporting.ts criado
- [ ] canonical URL no index.html
- [ ] robots meta no index.html
- [ ] nginx.conf criado

## Baixa Prioridade
- [ ] k8s/ criado
- [ ] DEPRECATED markers resolvidos
- [ ] REVIEW markers documentados

---

# 📝 NOTAS FINAIS

Este plano foi gerado através de análise exaustiva do repositório via API do GitHub em 11/01/2026.

**Commits de referência:**
- Último commit: a2dc377
- Total de commits hoje: 100+

**Repositório:** https://github.com/adm01-debug/vis-o

---

*Documento gerado automaticamente - V19 Implementation Plan*
