# ♿ Accessibility Guide - Projeto VISÃO

## Acessibilidade (A11y)

---

## 1. WCAG 2.1 Compliance

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

<table role="table" aria-label="Lista de alertas">
  <thead role="rowgroup">
    <tr role="row">
      <th role="columnheader">Tipo</th>
    </tr>
  </thead>
</table>
```

---

## 3. Navegação por Teclado

| Tecla | Ação |
|-------|------|
| Tab | Próximo elemento |
| Shift+Tab | Elemento anterior |
| Enter | Ativar |
| Escape | Fechar modal |
| Arrow keys | Navegar em listas |

### Focus Visible

```css
*:focus-visible {
  outline: 2px solid var(--ring);
  outline-offset: 2px;
}
```

---

## 4. Contraste de Cores

| Combinação | Ratio | Status |
|------------|-------|--------|
| Text/Background | 7:1 | ✅ AAA |
| Large text | 4.5:1 | ✅ AA |
| UI Components | 3:1 | ✅ AA |

---

## 5. Screen Readers

### Live Regions

```tsx
<div
  role="alert"
  aria-live="assertive"
  aria-atomic="true"
>
  {alertMessage}
</div>

<div
  aria-live="polite"
  aria-busy={isLoading}
>
  {status}
</div>
```

---

## 6. Formulários

```tsx
<label htmlFor="camera-name">
  Nome da Câmera
  <span aria-hidden="true">*</span>
</label>
<input
  id="camera-name"
  aria-required="true"
  aria-invalid={!!errors.name}
  aria-describedby="name-error"
/>
{errors.name && (
  <span id="name-error" role="alert">
    {errors.name}
  </span>
)}
```

---

## 7. Imagens

```tsx
// Informativa
<img src="alert.png" alt="Alerta de intrusão detectado" />

// Decorativa
<img src="icon.png" alt="" aria-hidden="true" />
```

---

## 8. Skip Links

```tsx
<a href="#main-content" className="skip-link">
  Pular para conteúdo principal
</a>
```

---

## 9. Motion Preferences

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 10. Testes

```bash
# Lighthouse
npm run lighthouse

# Storybook a11y addon
npm run storybook
# Verificar aba "Accessibility"
```

---

**Última atualização:** 06/01/2026
