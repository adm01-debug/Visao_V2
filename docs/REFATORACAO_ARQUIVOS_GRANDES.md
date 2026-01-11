# 📊 PLANO DE REFATORAÇÃO - ARQUIVOS GRANDES

> Este documento lista os arquivos que excedem 20KB e devem ser refatorados para melhor manutenibilidade.

## 🎯 Objetivo

Dividir componentes monolíticos em módulos menores e mais focados, seguindo o princípio de Responsabilidade Única.

---

## 📁 Arquivos Prioritários

### 1. SearchDropdown.tsx (37KB)
**Ação:** Extrair para:
- `SearchDropdown/index.tsx` - Componente principal
- `SearchDropdown/SearchInput.tsx` - Input de busca
- `SearchDropdown/SearchResults.tsx` - Lista de resultados
- `SearchDropdown/SearchItem.tsx` - Item individual
- `SearchDropdown/useSearch.ts` - Hook de lógica

### 2. Sidebar.tsx (33KB)
**Ação:** Extrair para:
- `Sidebar/index.tsx` - Container
- `Sidebar/SidebarNav.tsx` - Navegação
- `Sidebar/SidebarUser.tsx` - Info do usuário
- `Sidebar/SidebarFooter.tsx` - Rodapé
- `Sidebar/useSidebar.ts` - Hook de estado

### 3. AutomationRulesManager.tsx (28.4KB)
**Ação:** Extrair para:
- `AutomationRules/Manager.tsx` - Container
- `AutomationRules/RuleList.tsx` - Lista de regras
- `AutomationRules/RuleEditor.tsx` - Editor de regra
- `AutomationRules/RuleCondition.tsx` - Condição
- `AutomationRules/RuleAction.tsx` - Ação

### 4. Dashboard.tsx (25.7KB)
**Ação:** Extrair para:
- `Dashboard/index.tsx` - Layout principal
- `Dashboard/DashboardHeader.tsx` - Cabeçalho
- `Dashboard/DashboardWidgets.tsx` - Container de widgets
- `Dashboard/DashboardStats.tsx` - Estatísticas

### 5. useContinuousAnalysis.ts (25KB)
**Ação:** Dividir em:
- `useContinuousAnalysis/index.ts` - Hook principal
- `useContinuousAnalysis/useAnalysisState.ts` - Estado
- `useContinuousAnalysis/useAnalysisActions.ts` - Ações
- `useContinuousAnalysis/analysisUtils.ts` - Utilitários

### 6. ClipGallery.tsx (23.6KB)
**Ação:** Extrair para:
- `ClipGallery/index.tsx` - Container
- `ClipGallery/ClipCard.tsx` - Card individual
- `ClipGallery/ClipFilters.tsx` - Filtros
- `ClipGallery/ClipPlayer.tsx` - Player

### 7. AnalysisHistoryTable.tsx (23.3KB)
**Ação:** Extrair para:
- `AnalysisHistory/Table.tsx` - Tabela
- `AnalysisHistory/TableRow.tsx` - Linha
- `AnalysisHistory/TableFilters.tsx` - Filtros
- `AnalysisHistory/TablePagination.tsx` - Paginação

### 8. MultiCameraRecognition.tsx (23.1KB)
**Ação:** Dividir por responsabilidade

### 9. NotificationSecretsConfig.tsx (23.1KB)
**Ação:** Extrair para:
- `NotificationSecrets/Config.tsx` - Container
- `NotificationSecrets/SecretForm.tsx` - Formulário
- `NotificationSecrets/SecretList.tsx` - Lista

### 10. CameraWithContinuousAnalysis.tsx (22.1KB)
**Ação:** Extrair para:
- `CameraAnalysis/index.tsx` - Container
- `CameraAnalysis/AnalysisOverlay.tsx` - Overlay
- `CameraAnalysis/AnalysisControls.tsx` - Controles

---

## ✅ Checklist de Refatoração

Para cada arquivo:
- [ ] Identificar responsabilidades distintas
- [ ] Criar subpastas/módulos
- [ ] Extrair componentes menores
- [ ] Manter testes funcionando
- [ ] Atualizar imports
- [ ] Documentar mudanças

---

## 📈 Métricas de Sucesso

| Arquivo | Antes | Meta |
|---------|-------|------|
| SearchDropdown | 37KB | <10KB cada módulo |
| Sidebar | 33KB | <8KB cada módulo |
| AutomationRulesManager | 28KB | <7KB cada módulo |
| Dashboard | 26KB | <8KB cada módulo |
| Outros | 22-25KB | <8KB cada módulo |

---

*Documento criado como parte do Sprint 3 de Performance*
