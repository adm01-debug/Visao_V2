# ♿ Acessibilidade - VISÃO

## Padrões WCAG 2.1 AA

### Navegação
- Skip links implementados
- Focus visível em todos elementos
- Navegação por teclado completa

### Semântica
- Landmarks ARIA (main, nav, etc)
- Headings hierárquicos
- Labels em todos os forms

### Visual
- Contraste mínimo 4.5:1
- Tamanho de fonte ajustável
- Modo escuro acessível

### Interação
- Áreas de clique mínimo 44px
- Estados de hover/focus claros
- Feedback de ações

## Componentes Acessíveis

- `SkipLink` - Pular navegação
- `VisuallyHidden` - Texto só para leitores
- `aria-labels` em todas as páginas

## Testes

```bash
# Lighthouse
npm run lighthouse

# axe-core
npm run test:a11y
```

## Recursos

- [WCAG Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [MDN ARIA](https://developer.mozilla.org/docs/Web/Accessibility/ARIA)

