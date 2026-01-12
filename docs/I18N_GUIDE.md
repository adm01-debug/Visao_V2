# Internationalization (i18n) Guide

## Overview

VIS-O uses i18next for internationalization.

## Setup

```tsx
// src/i18n/index.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import ptBR from './locales/pt-BR.json';
import enUS from './locales/en-US.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      'pt-BR': { translation: ptBR },
      'en-US': { translation: enUS },
    },
    fallbackLng: 'pt-BR',
    interpolation: { escapeValue: false },
  });
```

## Usage

### In Components
```tsx
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation();
  return <h1>{t('common.welcome')}</h1>;
}
```

### With Interpolation
```tsx
{t('greeting', { name: 'John' })}
// pt-BR.json: "greeting": "Olá, {{name}}!"
```

### Pluralization
```tsx
{t('items', { count: 5 })}
// "items_one": "1 item"
// "items_other": "{{count}} items"
```

## Adding New Language

1. Create `src/i18n/locales/xx-XX.json`
2. Add to i18n config
3. Test all strings

## Best Practices

- Never hardcode user-facing text
- Use namespaces for large apps
- Keep keys organized by feature
- Include context in keys

## Supported Languages

| Code | Language |
|------|----------|
| pt-BR | Portuguese (Brazil) |
| en-US | English (US) |

---

*Last updated: January 2026*
