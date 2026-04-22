---
name: QA Console Report Generator
description: tests/e2e/qa-console-sweep.spec.ts + scripts/build-qa-console-report.mjs capturam console errors em 12 rotas (desktop+mobile), filtram ruído e geram report.md com passos de reprodução
type: feature
---

# QA Console Report Generator

Pipeline para consolidar erros de console reais durante o QA sweep.

## Comandos

```bash
npm run qa:console-sweep    # Playwright varre 12 rotas × 2 viewports → raw-events.json
npm run report:qa-console   # Filtra ruído + gera Markdown
npm run qa:console-full     # Faz os dois em sequência
```

## Saídas (`qa-console-report/`)

- `raw-events.json` — todos os eventos brutos
- `report.md` — relatório principal (resumo, issues agrupadas, passos de reprodução, sugestões de triagem, apêndice de ruído)
- `report.json` — versão estruturada para CI

## Filtros de ruído (em `NOISE_PATTERNS`)

Vite HMR, React DevTools, Lovable badge, favicon 404, ResizeObserver loop, Sentry noise, extensões de browser, HMR websocket close, auth probes 401.

## Severidade

- **Alta** 🔴 — `pageerror`, HTTP 5xx, mensagens com "uncaught/throw/cannot read"
- **Média** 🟡 — demais console errors e HTTP 4xx

## Exit code

`build-qa-console-report.mjs` sai com **1** se houver erro de severidade alta — permite usar como gate em CI.

## Estrutura do report.md

Cada issue inclui passos prontos: `npm run preview:reset` → DevTools/viewport → login → navegar para rota → filtrar console → confirmar mensagem.
