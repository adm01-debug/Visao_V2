

## Migrar 7 páginas para `useManagedFilters`

Aplicar confirmação, toast detalhado e undo (10s) ao "Limpar filtros" das páginas restantes, reaproveitando o hook já criado e o padrão validado em `RecognitionLogsPage`.

### Páginas e mudanças

| Página | Scope | Filtros mapeados | Labels (pt-BR) |
|---|---|---|---|
| `AlertsPage.tsx` | `alerts` | `search`, `severity`, `type`, `cameraId`, `readStatus`, `dateRange` | busca, severidade, tipo, câmera, leitura, período |
| `CamerasPage.tsx` | `cameras` | `searchQuery`, `statusFilter` | busca, status |
| `PeoplePage.tsx` (`usePeopleData`) | `people` | `search`, `activeOnly` | busca, apenas ativos |
| `ZonesPage.tsx` | `zones` | `searchQuery`, `selectedCameraFilter`, `selectedTypeFilter` | busca, câmera, tipo |
| `RecordingsPage.tsx` | `recordings` | `searchQuery`, `cameraFilter`, `dateFilter` | busca, câmera, período |
| `AnalysisHistoryPanel.tsx` | `analysis-history` | `typeFilter`, `severityFilter` | tipo, severidade |
| `LicensePlatePage` → `DetectionsHistoryTab.tsx` | `license-plate-history` | `searchQuery` | busca |

### Padrão de migração (5–10 linhas por página)

Cada página segue exatamente o template já validado em `RecognitionLogsPage`:

```ts
interface AlertFiltersShape extends AlertFilters { [key: string]: unknown; }
const { filters, setFilters, clearFilters, hasActiveFilters } =
  useManagedFilters<AlertFiltersShape>({
    scope: 'alerts',
    defaults: defaultFilters,
    labels: { search: 'busca', severity: 'severidade', /* ... */ },
  });
```

Substituir o `useState<...>(defaultFilters)` + `clearFilters` ad-hoc; manter os `setFilters(f => ({...}))` existentes (assinatura compatível). Botões que hoje fazem reset inline (ex.: "Limpar" em `CamerasPage`, `ZonesPage`) passam a chamar `clearFilters()` do hook, ganhando modal + toast + undo automaticamente.

### Casos especiais

- **AlertsPage**: o `clearFilters` atual também reseta `activeStatsFilter` (estado local). Após `clearFilters` do hook abrir o modal, o reset do `activeStatsFilter` é feito num callback `onAfterClear` (extensão simples no hook: aceitar prop opcional `onAfterClear?: () => void` chamada no `performClear`, antes do toast). Mantém comportamento atual sem regressão.
- **PeoplePage**: filtros vivem em `usePeopleData` — substituir `useState<Filters>` pelo hook lá dentro e expor `clearFilters` no retorno; UI atual já tem botão `X` apenas para `search`, adicionar botão "Limpar" condicionado em `hasActiveFilters` (consistência com outras páginas).
- **AnalysisHistoryPanel**: filtros são dois `useState` separados — consolidar em um objeto `{ typeFilter, severityFilter }` para o hook; props do `<AnalysisHistoryFilters>` permanecem iguais (continua recebendo handlers `onTypeChange` / `onSeverityChange`).
- **LicensePlatePage**: o "histórico" hoje só tem busca textual e o botão "Buscar" dispara `handleSearchDetections`. Adicionar `clearFilters` ao lado do botão Buscar quando `hasActiveFilters` (atualmente não há botão "Limpar" — passa a ter).
- **`useFilterStore` (Zustand)**: já recebeu wrapper compat em PR anterior. Sem mudança.

### Pequena extensão do hook

Adicionar prop opcional ao `UseManagedFiltersOptions`:

```ts
onAfterClear?: () => void;  // chamado após reset, antes do toast
```

Necessário para `AlertsPage` (resetar `activeStatsFilter`) e útil para futuras páginas que tenham estado satélite.

### Critérios de aceitação

- ✅ Cada uma das 7 páginas usa `useManagedFilters` com `scope` único.
- ✅ Clicar "Limpar filtros" abre `ConfirmDialog` listando os campos ativos em pt-BR.
- ✅ Após confirmar, toast lista campos removidos + chave localStorage; botão "Desfazer" restaura por 10s.
- ✅ Filtros persistem entre browsers via `user_filter_preferences` (tabela já criada).
- ✅ `npm run build` passa (sem novos erros de `noUnusedParameters` nem strict).
- ✅ Layouts visuais permanecem idênticos (apenas comportamento de "Limpar" muda).
- ✅ `mem://features/managed-filters-system` atualizada listando as 8 páginas migradas.

### Arquivos a editar/criar

| Arquivo | Mudança |
|---|---|
| `src/hooks/useManagedFilters.ts` | ✏️ adicionar `onAfterClear?` opcional |
| `src/pages/AlertsPage.tsx` | ✏️ migrar (usa `onAfterClear` para `activeStatsFilter`) |
| `src/pages/CamerasPage.tsx` | ✏️ migrar + chamar `clearFilters()` no botão e `EmptyState` |
| `src/components/people/usePeopleData.ts` | ✏️ migrar + expor `clearFilters`/`hasActiveFilters` |
| `src/pages/PeoplePage.tsx` | ✏️ adicionar botão "Limpar" no header de filtros |
| `src/pages/ZonesPage.tsx` | ✏️ migrar (substitui reset inline) |
| `src/pages/RecordingsPage.tsx` | ✏️ migrar + adicionar botão "Limpar" |
| `src/components/AnalysisHistoryPanel.tsx` | ✏️ migrar (consolida 2 useStates num objeto) |
| `src/components/license-plate/DetectionsHistoryTab.tsx` | ✏️ migrar busca + adicionar botão "Limpar" |
| `src/pages/LicensePlatePage.tsx` | ✏️ ajustar prop drilling do `searchQuery`/`clearFilters` |
| `docs/FILTER_SYSTEM.md` | ✏️ marcar 8 páginas como ✅ migradas |
| `mem://features/managed-filters-system` | ✏️ atualizar inventário |

### Riscos e mitigações

- **Risco:** `setFilters(f => ({...f}))` em alguns lugares passa filtros parciais sem todas as keys de `defaults`. **Mitigação:** o hook já faz spread `{...defaults, ...filters}` no estado inicial; assinatura functional preserva keys.
- **Risco:** `AlertsPage` tem múltiplos pontos que chamam `setFilters(defaultFilters)` direto (stats card, severity click). **Mitigação:** esses NÃO são "limpar filtros" do usuário (são filtros direcionados), continuam usando `setFilters` direto sem confirmação — só o botão "Limpar" usa `clearFilters()`.
- **Risco:** `usePeopleData` é compartilhado e mudar assinatura pode quebrar consumidores. **Mitigação:** apenas adicionar campos ao retorno (não remover nem renomear); 100% retro-compatível.
- **Risco:** primeira render no Sheet do `AnalysisHistoryPanel` chama o hook mesmo fechado. **Mitigação:** hook é leve (localStorage sync), sem custo perceptível.

