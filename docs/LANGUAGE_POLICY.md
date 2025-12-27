# 🇧🇷 POLÍTICA DE IDIOMA - PROJETO VISÃO

## Idioma Oficial
**Português do Brasil (PT-BR)** - EXCLUSIVO

---

## ⛔ PROIBIÇÕES ABSOLUTAS

### Arquivos Proibidos
- ❌ `i18n.ts` / `i18n.tsx`
- ❌ `translation*.ts`
- ❌ `locale*.ts`
- ❌ `*.json` em pasta `locales/`
- ❌ `LanguageSelector.tsx`

### Hooks/Funções Proibidos
- ❌ `useI18n()`
- ❌ `useTranslation()`
- ❌ `useLocale()`
- ❌ `t()` para traduções
- ❌ `i18next`
- ❌ `react-intl`
- ❌ `formatjs`

### Pastas Proibidas
- ❌ `src/locales/`
- ❌ `src/i18n/`
- ❌ `src/translations/`
- ❌ `public/locales/`

---

## ✅ PADRÃO OBRIGATÓRIO

### Textos em Componentes
```tsx
// ✅ CORRETO - Texto direto em PT-BR
<h1>Painel de Controle</h1>
<button>Salvar</button>
<p>Nenhum resultado encontrado</p>

// ❌ INCORRETO - Nunca usar
<h1>{t('dashboard.title')}</h1>
<button>{t('common.save')}</button>
```

### Mensagens de Erro
```tsx
// ✅ CORRETO
throw new Error('Usuário não encontrado');
toast.error('Falha ao carregar dados');

// ❌ INCORRETO
throw new Error(t('errors.userNotFound'));
```

### Constantes
```tsx
// ✅ CORRETO
export const LABELS = {
  save: 'Salvar',
  cancel: 'Cancelar',
  delete: 'Excluir',
};

// ❌ INCORRETO - Nunca importar de locales
import { labels } from '@/locales/pt-BR';
```

---

## 📋 CHECKLIST DE REVISÃO

Antes de cada commit, verificar:

- [ ] Nenhum import de `i18n` ou `useI18n`
- [ ] Nenhum uso de função `t()`
- [ ] Todos os textos em PT-BR
- [ ] Nenhum arquivo em `locales/`
- [ ] Nenhuma dependência de i18n no package.json

---

## 🎯 BENEFÍCIOS

1. **Performance** - Menor bundle, sem overhead de tradução
2. **Simplicidade** - Código mais limpo e direto
3. **Manutenção** - Mais fácil de atualizar textos
4. **Consistência** - Um idioma, uma fonte de verdade
5. **Velocidade** - Desenvolvimento mais rápido

---

## 📅 Vigência

**Data:** 27/12/2024
**Status:** PERMANENTE
**Revisão:** Não aplicável

---

*Este documento é definitivo e não está sujeito a alterações.*
