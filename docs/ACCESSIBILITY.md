# Accessibility Guide - VISÃO

## Padrões WCAG 2.1

### Implementado
- `lang="pt-BR"` no HTML
- `id="main-content"` para skip link
- `role="main"` em containers
- `aria-label` em elementos interativos
- Contraste de cores adequado
- Fontes legíveis (min 16px)

### Navegação por Teclado
- Tab navega entre elementos
- Enter/Space ativa botões
- Escape fecha modais
- Arrow keys em menus

### Screen Readers
- Alt text em imagens
- Labels em formulários
- Live regions para updates
- Headings hierárquicos

### Testes
- axe-core para audits
- Lighthouse accessibility
- Teste manual com NVDA/VoiceOver

## Recursos
- [WCAG 2.1](https://www.w3.org/WAI/WCAG21/quickref/)
- [MDN ARIA](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA)
