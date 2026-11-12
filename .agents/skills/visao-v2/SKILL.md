---
name: visao-v2
description: Convenções de código e commit do VISÃO V2 (TypeScript, Conventional Commits). Use ao alterar código, criar testes ou escrever mensagem de commit neste repositório; as regras operacionais ficam em AGENTS.md.
---

# VISÃO V2 — convenções

As regras de trabalho (banco, fluxo Git, PR, comunicação) estão em `AGENTS.md` na raiz — este skill só
resume convenções de código e commit.

## Commits

Conventional Commits, cobrado pelo hook `commit-msg` (`commitlint --edit`, config em
`commitlint.config.js`): `<tipo>(<escopo>): <descrição>` — escopo opcional e minúsculo; assunto em
minúsculas, até 100 caracteres, sem ponto final; tipos: `feat fix docs style refactor perf test chore
revert ci build` (**não existe `infra`** — use `ci` ou `chore`). Mensagem em PT-BR, modo imperativo,
primeira linha curta.

Exemplo: `fix(db): aponta config.toml para o projeto oficial`

## Código

- Linguagem: TypeScript (front Vite + React 19 em `src/`, edge functions Deno em `supabase/functions/`).
- Funções `camelCase`, classes/componentes `PascalCase`, constantes `SCREAMING_SNAKE_CASE`.
- Exports nomeados; siga o padrão de import do arquivo vizinho (alias `@/` para `src/`).
- Página nova: `lazy()` em `src/App.tsx`, `<PageContent>` como wrapper raiz, estados de erro/loading/vazio.
  `mb-mobile-nav` só em `src/components/layout/MainLayout.tsx` — gates de CI cobram os dois.
- Testes unitários ao lado do módulo (`__tests__/`) ou em `tests/e2e/` (Playwright); rode só o que tocou:
  `npx vitest run <caminho>`.
- Antes do commit: `npm run type-check:strict` e `npm run format:check` (os hooks rodam os mesmos gates).
- Siga os padrões já existentes no módulo; não desvie sem motivo registrado na PR.
