# ♿ Accessibility Guide - Projeto VISÃO

## Conformidade WCAG 2.1

---

## 1. Níveis de Conformidade

| Nível | Status |
|-------|--------|
| A | ✅ Completo |
| AA | ✅ Completo |
| AAA | 🔄 Parcial |

---

## 2. ARIA Labels

```tsx
<button
  aria-label="Pausar gravação"
  aria-pressed={isPaused}
>
  <PauseIcon aria-hidden="true" />
</button>
```

---

## 3. Navegação por Teclado

| Tecla | Ação |
|-------|------|
| Tab | Próximo elemento |
| Shift+Tab | Elemento anterior |
| Enter | Ativar |
| Escape | Fechar modal |
| Arrow Keys | Navegar em listas |

---

## 4. Focus Management

```tsx
// Focus trap em modais
import { FocusTrap } from 'focus-trap-react';

<FocusTrap>
  <Dialog>...</Dialog>
</FocusTrap>
```

---

## 5. Contraste de Cores

| Combinação | Ratio | Status |
|------------|-------|--------|
| Text/Background | 7:1 | ✅ AAA |
| Large text | 4.5:1 | ✅ AA |
| Icons | 3:1 | ✅ AA |

---

## 6. Screen Readers

```tsx
// Texto apenas para leitores
<span className="sr-only">
  Novo alerta de alta severidade
</span>

// Live regions
<div aria-live="polite" aria-atomic="true">
  {alertCount} novos alertas
</div>
```

---

## 7. Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 8. Forms Acessíveis

```tsx
<label htmlFor="camera-name">
  Nome da câmera
</label>
<input
  id="camera-name"
  aria-required="true"
  aria-describedby="name-hint"
/>
<span id="name-hint">
  Nome único para identificação
</span>
```

---

## 9. Skip Links

```tsx
<a href="#main-content" className="skip-link">
  Pular para conteúdo principal
</a>
```

---

## 10. Testing

```bash
# Addon Storybook
@storybook/addon-a11y

# Lighthouse
npm run lighthouse

# axe-core
npm run test:a11y
```

---

**Última atualização:** 06/01/2026
