# 📁 Guia de Refatoração de Arquivos Grandes

> **Objetivo:** Dividir componentes grandes em módulos menores e mais manuteníveis

---

## 📊 Arquivos Identificados para Refatoração

| Arquivo | Tamanho | Prioridade | Status |
|---------|---------|------------|--------|
| SearchDropdown.tsx | 37KB | Alta | ⏳ Pendente |
| Sidebar.tsx | 33KB | Alta | ⏳ Pendente |
| AutomationRulesManager.tsx | 28.4KB | Alta | ⏳ Pendente |
| Dashboard.tsx | 25.7KB | Média | ⏳ Pendente |
| useContinuousAnalysis.ts | 25KB | Média | ⏳ Pendente |
| ClipGallery.tsx | 23.6KB | Média | ⏳ Pendente |
| AnalysisHistoryTable.tsx | 23.3KB | Média | ⏳ Pendente |
| MultiCameraRecognition.tsx | 23.1KB | Média | ⏳ Pendente |
| NotificationSecretsConfig.tsx | 23.1KB | Média | ⏳ Pendente |
| CameraWithContinuousAnalysis.tsx | 22.1KB | Média | ⏳ Pendente |

---

## 🎯 Estratégia de Refatoração

### 1. SearchDropdown.tsx (37KB)
**Extrair:**
- `SearchInput.tsx` - Campo de busca
- `SearchResults.tsx` - Lista de resultados
- `SearchFilters.tsx` - Filtros de busca
- `SearchHistory.tsx` - Histórico de buscas
- `useSearch.ts` - Hook de lógica de busca

### 2. Sidebar.tsx (33KB)
**Extrair:**
- `SidebarNav.tsx` - Navegação principal
- `SidebarUser.tsx` - Info do usuário
- `SidebarFooter.tsx` - Footer com ações
- `SidebarCollapse.tsx` - Controle de colapso
- `useSidebar.ts` - Hook de estado

### 3. AutomationRulesManager.tsx (28.4KB)
**Extrair:**
- `RuleList.tsx` - Lista de regras
- `RuleEditor.tsx` - Editor de regra
- `RuleConditions.tsx` - Condições
- `RuleActions.tsx` - Ações
- `useRuleManager.ts` - Hook de gestão

### 4. Dashboard.tsx (25.7KB)
**Extrair:**
- `DashboardHeader.tsx` - Cabeçalho
- `DashboardWidgets.tsx` - Grid de widgets
- `DashboardStats.tsx` - Estatísticas
- `DashboardActions.tsx` - Ações rápidas

### 5. useContinuousAnalysis.ts (25KB)
**Extrair:**
- `useAnalysisQueue.ts` - Fila de análise
- `useAnalysisResults.ts` - Resultados
- `useAnalysisConfig.ts` - Configuração
- `analysisUtils.ts` - Utilitários

---

## 📝 Template de Refatoração

```tsx
// Antes: ComponenteGrande.tsx (30KB)

// Depois:
// ComponenteGrande/
//   index.tsx (re-export)
//   ComponenteGrande.tsx (principal, ~8KB)
//   SubComponente1.tsx (~5KB)
//   SubComponente2.tsx (~5KB)
//   useComponenteLogic.ts (~5KB)
//   types.ts (~2KB)
//   constants.ts (~1KB)
```

---

## ✅ Checklist de Refatoração

- [ ] Identificar subcomponentes lógicos
- [ ] Extrair tipos para arquivo separado
- [ ] Extrair constantes
- [ ] Criar hooks para lógica complexa
- [ ] Manter compatibilidade de API
- [ ] Atualizar imports em arquivos dependentes
- [ ] Adicionar testes aos novos componentes
- [ ] Documentar mudanças no CHANGELOG

---

*Documento gerado automaticamente - Atualizar conforme progresso*
