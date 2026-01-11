# Internationalization (i18n) Guide

## Setup
i18n is configured in `src/i18n/index.ts`.

## Usage
```tsx
import { useTranslation } from 'react-i18next';

function Component() {
  const { t } = useTranslation();
  return <h1>{t('common.title')}</h1>;
}
```

## Adding Translations
1. Add keys to `src/i18n/locales/pt-BR.json`
2. Add keys to `src/i18n/locales/en-US.json`

## Language Detection
Browser language is detected automatically.

---
*Last updated: January 2026*
