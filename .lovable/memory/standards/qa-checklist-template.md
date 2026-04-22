---
name: QA Checklist Template
description: Template guiado em docs/qa-checklist-template.md com 10 seções (rotas, drawer, padding, standalone) e estrutura docs/qa-runs/ para versionar evidências
type: preference
---

# QA Checklist Template

Template oficial para validação manual de responsividade e mobile nav.

**Localização:** `docs/qa-checklist-template.md`
**Runs:** `docs/qa-runs/QA-YYYY-MM-DD-<release>.md`
**Assets:** `docs/qa-runs/assets/<run-id>/`

## Estrutura (10 seções)

0. Pré-requisitos (reset preview, login, console limpo)
1. Rotas autenticadas — desktop (12 rotas)
2. Rotas autenticadas — mobile iPhone 12 (12 rotas)
3. Drawer / BottomNav comportamento (8 critérios × 3 rotas)
4. Padding `mb-mobile-nav` (validação heurística)
5. Páginas standalone (4 rotas sem MainLayout)
6. Console & network hygiene
7. Anexos & evidências (nomenclatura padronizada)
8. Issues encontradas (tabela)
9. Cobertura E2E equivalente (6 suítes)
10. Aprovação final (QA + Tech Lead)

## Como aplicar

- Sempre que abrir uma run, copiar o template em vez de editar o original.
- Manter os critérios sincronizados com os scripts em `scripts/check-*.mjs` e suítes Playwright em `tests/e2e/`.
- Quando uma seção for automatizada, marcar no item correspondente da seção 9.
