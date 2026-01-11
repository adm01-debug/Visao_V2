# Accessibility Guide (WCAG 2.1 AA)

## Keyboard Navigation

All interactive elements must be keyboard accessible:
- Tab to navigate
- Enter/Space to activate
- Escape to close modals
- Arrow keys for lists

## Focus Management

Use `src/lib/accessibility.ts`:
```tsx
import { trapFocus, getFocusableElements } from '@/lib/accessibility';
```

## Screen Readers

- Use semantic HTML
- Add ARIA labels where needed
- Use `announceToScreenReader()` for dynamic updates

## Color Contrast

Minimum 4.5:1 for normal text, 3:1 for large text.

```tsx
import { meetsContrastAA } from '@/lib/accessibility';
meetsContrastAA('#333333', '#ffffff'); // true
```

## Components

### Skip Link
```tsx
<SkipLink />
```

### Focus Trap
```tsx
<FocusTrap><Modal /></FocusTrap>
```

### A11y Announcer
```tsx
<A11yAnnouncer />
```

## Testing

- Use axe-core
- Test with screen readers
- Keyboard-only navigation test

---
*Last updated: January 2026*
