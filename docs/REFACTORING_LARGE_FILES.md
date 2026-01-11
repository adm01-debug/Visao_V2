# 📝 Guia de Refatoração de Arquivos Grandes

> Este documento lista os arquivos que excedem 20KB e precisam ser divididos em componentes menores.

## 📊 Arquivos para Refatorar

| Arquivo | Tamanho | Prioridade | Status |
|---------|---------|------------|--------|
| SearchDropdown.tsx | 37KB | Alta | ⏳ Pendente |
| Sidebar.tsx | 33KB | Alta | ⏳ Pendente |
| AutomationRulesManager.tsx | 28.4KB | Média | ⏳ Pendente |
| Dashboard.tsx | 25.7KB | Média | ⏳ Pendente |
| useContinuousAnalysis.ts | 25KB | Média | ⏳ Pendente |
| ClipGallery.tsx | 23.6KB | Baixa | ⏳ Pendente |
| AnalysisHistoryTable.tsx | 23.3KB | Baixa | ⏳ Pendente |
| MultiCameraRecognition.tsx | 23.1KB | Baixa | ⏳ Pendente |
| NotificationSecretsConfig.tsx | 23.1KB | Baixa | ⏳ Pendente |
| CameraWithContinuousAnalysis.tsx | 22.1KB | Baixa | ⏳ Pendente |

## 🎯 Estratégias de Refatoração

### 1. SearchDropdown.tsx (37KB)
**Dividir em:**
- `SearchDropdownInput.tsx` - Campo de busca
- `SearchDropdownResults.tsx` - Lista de resultados
- `SearchDropdownFilters.tsx` - Filtros de busca
- `SearchDropdownCategory.tsx` - Categoria de resultado
- `useSearchDropdown.ts` - Hook com lógica

### 2. Sidebar.tsx (33KB)
**Dividir em:**
- `SidebarNav.tsx` - Navegação principal
- `SidebarUser.tsx` - Info do usuário
- `SidebarFooter.tsx` - Footer
- `SidebarMobile.tsx` - Versão mobile
- `useSidebar.ts` - Hook com estado

### 3. AutomationRulesManager.tsx (28.4KB)
**Dividir em:**
- `RuleEditor.tsx` - Editor de regra
- `RuleList.tsx` - Lista de regras
- `RuleConditions.tsx` - Condições
- `RuleActions.tsx` - Ações
- `useAutomationRules.ts` - Hook

### 4. Dashboard.tsx (25.7KB)
**Dividir em:**
- `DashboardHeader.tsx` - Header
- `DashboardWidgets.tsx` - Grid de widgets
- `DashboardStats.tsx` - Estatísticas
- `DashboardAlerts.tsx` - Alertas recentes

### 5. useContinuousAnalysis.ts (25KB)
**Dividir em:**
- `useAnalysisConfig.ts` - Configurações
- `useAnalysisStream.ts` - Stream de análise
- `useAnalysisResults.ts` - Resultados
- `useAnalysisHistory.ts` - Histórico

## 📋 Checklist de Refatoração

Para cada arquivo:

- [ ] Identificar responsabilidades distintas
- [ ] Extrair subcomponentes
- [ ] Criar hooks personalizados
- [ ] Mover tipos para arquivo separado
- [ ] Adicionar React.memo onde apropriado
- [ ] Manter testes funcionando
- [ ] Atualizar imports

## 🔧 Padrões a Seguir

```typescript
// Usar React.memo para componentes de lista
export const ListItem = memo(function ListItem({ item }: Props) {
  return <div>{item.name}</div>;
});

// Usar useCallback para handlers
const handleClick = useCallback(() => {
  // ...
}, [dependencies]);

// Usar useMemo para cálculos pesados
const filteredItems = useMemo(() => {
  return items.filter(/* ... */);
}, [items]);
```

## 📈 Meta

- [ ] Nenhum arquivo de componente > 15KB
- [ ] Nenhum hook > 10KB
- [ ] Todos os componentes de lista com React.memo
