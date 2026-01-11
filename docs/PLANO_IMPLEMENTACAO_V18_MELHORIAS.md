# 🎯 PLANO DE IMPLEMENTAÇÃO V18 - MELHORIAS PENDENTES

> **Data:** 2026-01-11 19:05:26
> **Total de Melhorias:** 101 itens identificados
> **Prioridade:** Ordenado por impacto e complexidade

---

## 📊 RESUMO EXECUTIVO

| Categoria | Quantidade | Prioridade | Esforço Est. |
|-----------|------------|------------|--------------|
| Type Safety | 5 | 🔴 Alta | 2h |
| Error Handling | 14 | 🔴 Alta | 4h |
| Performance | 12 | 🟡 Média | 6h |
| Documentação | 2 | 🟢 Baixa | 1h |
| i18n | 3 | 🟡 Média | 8h |
| Edge Functions | 2 | 🟡 Média | 2h |
| Code Markers | 29 | 🟡 Média | 6h |
| CI/CD | 34 | 🔴 Alta | Manual |
| **TOTAL** | **101** | | **~29h** |

---

## 🔴 SPRINT 1: TYPE SAFETY (5 itens - 2h)

### 1.1. Criar type declarations para Browser APIs

**Arquivos a criar:**
```
src/types/file-system-access.d.ts
src/types/performance-memory.d.ts
src/types/network-information.d.ts
```

**Ação:**
1. Criar declarações de tipo para File System Access API
2. Criar declarações para Performance Memory API
3. Criar declarações para Network Information API

---

### 1.2. Refatorar arquivos com "as any"

#### 1.2.1. `src/hooks/useFileSystemAccess.ts` (2 ocorrências)
```typescript
// ANTES:
const [handle] = await (window as any).showOpenFilePicker(options);
const handle = fileHandle || await (window as any).showSaveFilePicker(options);

// DEPOIS:
const [handle] = await window.showOpenFilePicker(options);
const handle = fileHandle || await window.showSaveFilePicker(options);
```

**Ação:** Usar type declarations criadas acima

---

#### 1.2.2. `src/hooks/usePerformanceMetrics.ts` (4 ocorrências)
```typescript
// ANTES:
deviceMemory: (navigator as any).deviceMemory || 0,
const perfMemory = (performance as any).memory;
const connection = (navigator as any).connection;

// DEPOIS:
deviceMemory: navigator.deviceMemory || 0,
const perfMemory = performance.memory;
const connection = navigator.connection;
```

**Ação:** Usar type declarations para Performance e Navigator

---

#### 1.2.3. `src/hooks/useGeolocation.ts` (1 ocorrência)
**Ação:** Verificar e corrigir cast desnecessário

---

#### 1.2.4. `src/components/ScreenCapture.tsx` (1 ocorrência)
```typescript
// ANTES:
video: { cursor: 'always' } as any,

// DEPOIS:
video: { cursor: 'always' } as DisplayMediaStreamOptions['video'],
```

---

#### 1.2.5. `src/hooks/useWebRTCPeer.ts` (1 ocorrência)
```typescript
// ANTES:
dataChannel.send(data as any);

// DEPOIS:
dataChannel.send(data as string | ArrayBuffer | Blob | ArrayBufferView);
```

---

## 🔴 SPRINT 2: ERROR HANDLING (14 itens - 4h)

### 2.1. Adicionar try-catch aos hooks

**Hooks a atualizar:**
1. `use-toast.ts`
2. `useAnalytics.ts`
3. `useBattery.ts`
4. `useBlacklistAlerts.ts`
5. `useBroadcastChannel.ts`
6. `useCopyToClipboard.ts`
7. `useCounter.ts`
8. `useDarkMode.ts`
9. `useDebounce.ts`
10. `useDeviceMotion.ts`
11. `useDocumentTitle.ts`
12. `useErrorBoundary.ts`
13. `useEventListener.ts`
14. `useFeatureFlags.ts`

**Template de implementação:**
```typescript
try {
  // código existente
} catch (error) {
  if (import.meta.env.DEV) {
    console.error('[HookName] Error:', error);
  }
  // handle gracefully
}
```

---

## 🟡 SPRINT 3: PERFORMANCE (12 itens - 6h)

### 3.1. Implementar React.lazy para code splitting

**Ação:** Adicionar lazy loading para rotas principais

```typescript
// src/App.tsx ou routes.ts
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const CamerasPage = React.lazy(() => import('./pages/CamerasPage'));
const AlertsPage = React.lazy(() => import('./pages/AlertsPage'));
// etc.
```

---

### 3.2. Adicionar React.memo a componentes pesados

**Componentes prioritários:**
1. `AlertCard.tsx`
2. `CameraCard.tsx`
3. `EventItem.tsx`
4. Qualquer componente renderizado em listas

---

### 3.3. Refatorar arquivos grandes (>20KB)

| Arquivo | Tamanho | Ação |
|---------|---------|------|
| SearchDropdown.tsx | 37KB | Extrair subcomponentes |
| Sidebar.tsx | 33KB | Dividir em SidebarNav, SidebarUser, etc. |
| AutomationRulesManager.tsx | 28.4KB | Extrair RuleEditor, RuleList, etc. |
| Dashboard.tsx | 25.7KB | Extrair DashboardWidgets, DashboardHeader |
| useContinuousAnalysis.ts | 25KB | Dividir em hooks menores |
| ClipGallery.tsx | 23.6KB | Extrair ClipCard, ClipFilters |
| AnalysisHistoryTable.tsx | 23.3KB | Extrair TableFilters, TableRow |
| MultiCameraRecognition.tsx | 23.1KB | Dividir por responsabilidade |
| NotificationSecretsConfig.tsx | 23.1KB | Extrair SecretForm, SecretList |
| CameraWithContinuousAnalysis.tsx | 22.1KB | Extrair AnalysisOverlay |

---

## 🟡 SPRINT 4: INTERNACIONALIZAÇÃO (3 itens - 8h)

### 4.1. Configurar react-i18next

**Instalação:**
```bash
npm install react-i18next i18next i18next-browser-languagedetector
```

**Configuração:**
```typescript
// src/i18n/index.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import ptBR from './locales/pt-BR.json';
import enUS from './locales/en-US.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      'pt-BR': { translation: ptBR },
      'en-US': { translation: enUS },
    },
    fallbackLng: 'pt-BR',
    interpolation: { escapeValue: false },
  });

export default i18n;
```

---

### 4.2. Criar arquivos de tradução

**Estrutura:**
```
src/
  i18n/
    index.ts
    locales/
      pt-BR.json
      en-US.json
      es-ES.json (futuro)
```

---

### 4.3. Migrar strings hardcoded

**Prioridade:** Componentes com mais strings
1. Mensagens de erro
2. Mensagens de sucesso
3. Labels de formulários
4. Textos de botões
5. Títulos e descrições

---

## 🟡 SPRINT 5: EDGE FUNCTIONS (2 itens - 2h)

### 5.1. Criar testes para `process-automation-rules`

```typescript
// supabase/functions/process-automation-rules/index.test.ts
import { assertEquals } from 'https://deno.land/std@0.192.0/testing/asserts.ts';

Deno.test('process-automation-rules', async () => {
  // implementar testes
});
```

---

### 5.2. Criar testes para `send-telegram`

```typescript
// supabase/functions/send-telegram/index.test.ts
import { assertEquals } from 'https://deno.land/std@0.192.0/testing/asserts.ts';

Deno.test('send-telegram', async () => {
  // implementar testes
});
```

---

## 🟢 SPRINT 6: DOCUMENTAÇÃO (2 itens - 1h)

### 6.1. Criar CODE_OF_CONDUCT.md na raiz

**Template:** Contributor Covenant v2.1

---

### 6.2. Melhorar JSDoc coverage

**Ação:** Adicionar @param e @returns aos hooks e utils principais

```typescript
/**
 * Hook para gerenciar estado de autenticação
 * @param options - Opções de configuração
 * @param options.redirectUrl - URL de redirecionamento após login
 * @returns Estado de autenticação e funções de controle
 */
export function useAuth(options?: AuthOptions): AuthState {
  // ...
}
```

---

## 🟡 SPRINT 7: CODE MARKERS (29 itens - 6h)

### 7.1. Resolver HACK markers (1)

**Arquivo:** Identificar e resolver

---

### 7.2. Resolver XXX markers (5)

**Ação:** Revisar e corrigir código temporário

---

### 7.3. Resolver BUG markers (14)

**Ação:** Investigar e corrigir bugs documentados

---

### 7.4. Resolver OPTIMIZE markers (7)

**Ação:** Implementar otimizações sugeridas

---

### 7.5. Resolver DEPRECATED markers (2)

**Ação:** Atualizar código legado

---

## 🔴 SPRINT 8: CI/CD (34 workflows - Manual)

### 8.1. Problema: GitHub Actions Billing

**Causa:** Repositório privado atingiu limite de minutos gratuitos

**Soluções:**
1. **Opção A:** Adicionar billing no GitHub
2. **Opção B:** Tornar repositório público
3. **Opção C:** Usar self-hosted runners

**Documentação:** Ver `docs/GITHUB_ACTIONS_BILLING.md`

---

## 📋 CHECKLIST DE IMPLEMENTAÇÃO

### Sprint 1 - Type Safety
- [ ] Criar src/types/file-system-access.d.ts
- [ ] Criar src/types/performance-memory.d.ts
- [ ] Criar src/types/network-information.d.ts
- [ ] Refatorar useFileSystemAccess.ts
- [ ] Refatorar usePerformanceMetrics.ts
- [ ] Refatorar useGeolocation.ts
- [ ] Refatorar ScreenCapture.tsx
- [ ] Refatorar useWebRTCPeer.ts

### Sprint 2 - Error Handling
- [ ] Adicionar try-catch a use-toast.ts
- [ ] Adicionar try-catch a useAnalytics.ts
- [ ] Adicionar try-catch a useBattery.ts
- [ ] Adicionar try-catch a useBlacklistAlerts.ts
- [ ] Adicionar try-catch a useBroadcastChannel.ts
- [ ] Adicionar try-catch a useCopyToClipboard.ts
- [ ] Adicionar try-catch a useCounter.ts
- [ ] Adicionar try-catch a useDarkMode.ts
- [ ] Adicionar try-catch a useDebounce.ts
- [ ] Adicionar try-catch a useDeviceMotion.ts
- [ ] Adicionar try-catch a useDocumentTitle.ts
- [ ] Adicionar try-catch a useErrorBoundary.ts
- [ ] Adicionar try-catch a useEventListener.ts
- [ ] Adicionar try-catch a useFeatureFlags.ts

### Sprint 3 - Performance
- [ ] Implementar React.lazy para rotas
- [ ] Adicionar React.memo a componentes de lista
- [ ] Refatorar SearchDropdown.tsx
- [ ] Refatorar Sidebar.tsx
- [ ] Refatorar AutomationRulesManager.tsx
- [ ] Refatorar Dashboard.tsx
- [ ] Refatorar useContinuousAnalysis.ts
- [ ] Refatorar ClipGallery.tsx
- [ ] Refatorar AnalysisHistoryTable.tsx
- [ ] Refatorar MultiCameraRecognition.tsx
- [ ] Refatorar NotificationSecretsConfig.tsx
- [ ] Refatorar CameraWithContinuousAnalysis.tsx

### Sprint 4 - i18n
- [ ] Instalar react-i18next
- [ ] Configurar i18n
- [ ] Criar pt-BR.json
- [ ] Criar en-US.json
- [ ] Migrar strings de erro
- [ ] Migrar strings de sucesso
- [ ] Migrar labels de formulários

### Sprint 5 - Edge Functions
- [ ] Criar process-automation-rules/index.test.ts
- [ ] Criar send-telegram/index.test.ts

### Sprint 6 - Documentação
- [ ] Criar CODE_OF_CONDUCT.md
- [ ] Melhorar JSDoc em hooks
- [ ] Melhorar JSDoc em utils

### Sprint 7 - Code Markers
- [ ] Resolver 1 HACK
- [ ] Resolver 5 XXX
- [ ] Resolver 14 BUG
- [ ] Resolver 7 OPTIMIZE
- [ ] Resolver 2 DEPRECATED

### Sprint 8 - CI/CD
- [ ] Resolver billing do GitHub Actions

---

## 📈 MÉTRICAS DE SUCESSO

| Métrica | Atual | Meta |
|---------|-------|------|
| "as any" em produção | 9 | 0 |
| Hooks sem try-catch | 14 | 0 |
| React.lazy usage | 0 | 10+ |
| React.memo usage | 1 | 20+ |
| Arquivos >20KB | 10 | 0 |
| i18n coverage | 0% | 100% |
| Edge Functions testadas | 9/11 | 11/11 |
| JSDoc com @param | 8 | 50+ |
| Workflows passando | 0/34 | 34/34 |

---

## 🔄 ORDEM DE EXECUÇÃO RECOMENDADA

1. **Sprint 1** (Type Safety) - Fundação para tudo
2. **Sprint 2** (Error Handling) - Estabilidade
3. **Sprint 8** (CI/CD) - Automação de validação
4. **Sprint 3** (Performance) - UX
5. **Sprint 5** (Edge Functions) - Backend
6. **Sprint 6** (Documentação) - Manutenibilidade
7. **Sprint 4** (i18n) - Internacionalização
8. **Sprint 7** (Code Markers) - Cleanup

---

*Plano gerado em: 2026-01-11 19:05:26*
