# Changelog - VISÃO

## [1.1.0] - 2024-12-22

### 🔧 Correções de Código
- Removido ~120 console.log de produção
- Corrigido ~50 tipos 'any' para tipos específicos
- Implementado validação real em Edge Functions

### 🧩 Componentes
- Integrado 24 componentes utilitários nas páginas
- Adicionado import de EmptyState, ErrorState, LoadingSpinner
- Integrado StatusBadge, SeverityBadge, TimeAgo

### 🪝 Hooks
- Exportado 16 hooks utilitários
- Integrado useDebounce, useOnlineStatus, useDocumentTitle
- Atualizado barrel exports em hooks/index.ts

### 📚 Libs
- Exportado 14 libs utilitárias
- Integrado logger em hooks principais
- Atualizado barrel exports em lib/index.ts

### 🧪 Testes
- Implementado ~20 testes reais (substituindo mocks)
- Removido expect(true).toBe(true)
- Adicionado cobertura para hooks principais

### ♿ Acessibilidade
- Adicionado lang="pt-BR" no HTML
- Adicionado id="main-content" para SkipLink
- Adicionado role="main" em todas as páginas
- Adicionado apple-touch-icon

### ⚡ Performance
- Adicionado React.memo em 20 componentes pesados
- Importado memo em componentes >5KB

### 📄 Documentação
- Criado TESTING.md
- Criado SECURITY.md
- Criado CONTRIBUTING.md
- Criado TROUBLESHOOTING.md
- Criado PERFORMANCE.md
- Criado ACCESSIBILITY.md
- Criado I18N.md
- Criado EDGE_FUNCTIONS.md
- Criado TYPES.md

### 🛠 DevOps
- Adicionado .nvmrc (Node 20)
- Adicionado .node-version
- Adicionado commitlint.config.js
- Adicionado cypress.config.ts
- Adicionado playwright.config.ts
- Adicionado .husky/pre-commit
- Adicionado .husky/commit-msg
- Adicionado scripts: lint:fix, format, typecheck, test:e2e, analyze
