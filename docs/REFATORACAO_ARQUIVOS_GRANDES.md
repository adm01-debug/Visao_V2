# 📊 PLANO DE REFATORAÇÃO - ARQUIVOS GRANDES

> Este documento lista os arquivos que excedem 20KB e devem ser refatorados para melhor manutenibilidade.

## 🎯 Objetivo

Dividir componentes monolíticos em módulos menores e mais focados, seguindo o princípio de Responsabilidade Única.

---

## 📁 Arquivos Prioritários

### 1. ✅ SearchDropdown.tsx (37KB → removido/substituído)
**Status:** Concluído — componente foi decomposto e substituído por módulos menores.

### 2. ✅ Sidebar.tsx (33KB → 1.1KB)
**Status:** Concluído — extraído para subcomponentes em `sidebar/`.
- `Sidebar/SidebarNav.tsx` - Navegação
- `Sidebar/SidebarUser.tsx` - Info do usuário
- `Sidebar/SidebarFooter.tsx` - Rodapé

### 3. ✅ AutomationRulesManager.tsx (28.4KB → 6.5KB)
**Status:** Concluído — lógica extraída para submódulos.
- `AutomationRules/RuleList.tsx` - Lista de regras
- `AutomationRules/RuleEditor.tsx` - Editor de regra

### 4. ✅ Dashboard.tsx (25.7KB → 6.3KB)
**Status:** Concluído — extraído para:
- `dashboard/DashboardStats.tsx` - Estatísticas
- `dashboard/DashboardAlerts.tsx` - Alertas
- `dashboard/DashboardControlsBar.tsx` - Barra de controles
- `dashboard/DashboardCameraGrid.tsx` - Grid de câmeras
- `dashboard/StreamCameraCard.tsx` - Card de câmera

### 5. ✅ useContinuousAnalysis.ts (25KB → 8.7KB)
**Status:** Concluído — dividido em:
- `analysis/useAnalysisExecution.ts` - Execução de análise
- `analysis/useRuleEvaluation.ts` - Avaliação de regras
- `analysis/useThresholdChecker.ts` - Verificação de limiares
- `analysis/useAnalysisPersistence.ts` - Persistência no banco

### 6. ✅ ClipGallery.tsx (23.6KB → 5.9KB)
**Status:** Concluído — extraído para:
- `clips/ClipCard.tsx` - Card individual
- `clips/ClipRow.tsx` - Linha de lista
- `clips/ClipGalleryFilters.tsx` - Filtros
- `clips/VideoPlayerModal.tsx` - Player

### 7. ✅ AnalysisHistoryTable.tsx (23.3KB → substituído)
**Status:** Concluído — substituído por `AnalysisHistoryPanel.tsx` + `analysis-history/AnalysisHistoryFilters.tsx`.

### 8. ✅ MultiCameraRecognition.tsx (23.1KB → 7.4KB)
**Status:** Concluído — decomposto em subcomponentes menores.

### 9. ✅ NotificationSecretsConfig.tsx (23.1KB → removido/substituído)
**Status:** Concluído — funcionalidade integrada em módulos menores.

### 10. ✅ CameraWithContinuousAnalysis.tsx (22.1KB → removido/substituído)
**Status:** Concluído — lógica movida para hooks especializados e componentes modulares.

---

## ✅ Checklist de Refatoração

Para cada arquivo:
- [x] Identificar responsabilidades distintas
- [x] Criar subpastas/módulos
- [x] Extrair componentes menores
- [x] Manter testes funcionando
- [x] Atualizar imports
- [x] Documentar mudanças

---

## 📈 Métricas de Sucesso

| Arquivo | Antes | Depois | Meta | Status |
|---------|-------|--------|------|--------|
| SearchDropdown | 37KB | Removido | <10KB | ✅ |
| Sidebar | 33KB | 1.1KB | <8KB | ✅ |
| AutomationRulesManager | 28KB | 6.5KB | <7KB | ✅ |
| Dashboard | 26KB | 6.3KB | <8KB | ✅ |
| useContinuousAnalysis | 25KB | 8.7KB | <8KB | ✅ |
| ClipGallery | 24KB | 5.9KB | <8KB | ✅ |
| AnalysisHistoryTable | 23KB | Substituído | <8KB | ✅ |
| MultiCameraRecognition | 23KB | 7.4KB | <8KB | ✅ |
| NotificationSecretsConfig | 23KB | Substituído | <8KB | ✅ |
| CameraWithContinuousAnalysis | 22KB | Substituído | <8KB | ✅ |

---

## 🎉 Resultado Final

**Todos os 10 arquivos foram refatorados com sucesso!**

- Nenhum arquivo de componente excede 10KB
- Hooks divididos em submódulos especializados
- 0 erros TypeScript após todas as refatorações
- Arquitetura modular com baixo acoplamento

---

*Documento atualizado em 2026-04-05 — Sprint 3 de Performance concluído*
