
## Fase 1: Corrigir Erros de Build (5 arquivos)
1. **src/lib/renderOptimizer.ts** - Remover declarações globais conflitantes de `IdleDeadline`/`Window`
2. **src/lib/sentry.ts** - Corrigir `logger.error(error)` → `logger.error(error.message)`
3. **src/lib/xss.ts** - Corrigir `.flat()` em ALLOWED_ATTR para flatten correto
4. **src/types/supabase.ts** - Remover referência a `recordings` (tabela inexistente)
5. **src/utils/compression.ts** - Corrigir tipo `Uint8Array` com cast para `BufferSource`
6. **src/types/index.ts** - Resolver colisões de barrel exports eliminando re-exports duplicados

## Fase 2: Refatorar God Components (10 páginas/hooks)

### Páginas (extrair subcomponentes para diretórios dedicados):

1. **ZonesPage** (1345 → ~200 linhas) → `src/components/zones/`
   - `ZoneCard.tsx`, `ZoneEditorSheet.tsx`, `ZoneViewDialog.tsx`, `useZonesData.ts`, `zonesConfig.ts`

2. **PeoplePage** (1315 → ~200 linhas) → `src/components/people/`
   - `PersonCard.tsx`, `PersonFormDialog.tsx`, `PersonDetailsDialog.tsx`, `usePeopleData.ts`

3. **SettingsPage** (1225 → ~200 linhas) → `src/components/settings/`
   - `GeneralSettings.tsx`, `NotificationSettings.tsx`, `AnalysisSettings.tsx`, `FaceSettings.tsx`, `SystemSettings.tsx`, `SettingsSection.tsx`

4. **SecurityPage** (986 → ~200 linhas) → `src/components/security/`
   - `AuditLogTable.tsx`, `AccessEventCard.tsx`, `SecurityPersonsList.tsx`, `useSecurityData.ts`

5. **RecordingsPage** (880 → ~200 linhas) → `src/components/recordings/`
   - `ClipCard.tsx`, `VideoPlayerDialog.tsx`, `useRecordingsData.ts`

6. **DashboardV2** (872 → ~200 linhas) → `src/components/dashboard-v2/`
   - Extrair seções em subcomponentes

7. **AlertsPage** (862 → ~200 linhas) → `src/components/alerts/`
   - Extrair filtros, tabela, e timeline

8. **AnalyticsPage** (823 → ~200 linhas) → `src/components/analytics/`
   - Extrair KPIs, gráficos, e filtros

9. **useContinuousAnalysis** (892 → ~300 linhas) → `src/hooks/analysis/`
   - Separar lógica de sessão, regras, e alertas

10. **ClipGallery** (789 → ~200 linhas) → `src/components/clips/`
    - Extrair subcomponentes de galeria
