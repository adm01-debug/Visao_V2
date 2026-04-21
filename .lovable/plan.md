

## Checklist automatizada: garantir `mb-mobile-nav` em todas as páginas

Script de verificação que falha o build quando uma página esquece a classe `mb-mobile-nav`, evitando regressões de layout mobile (overlap com a bottom navigation).

### O que será criado

**1. Script de auditoria** — `scripts/check-mobile-nav.mjs`
- Varre `src/pages/**/*.tsx`
- Para cada página, valida se contém a string `mb-mobile-nav` no JSX raiz
- Aplica allowlist para páginas legitimamente isentas:
  - `AuthPage.tsx`, `ResetPasswordPage.tsx` — fluxo de auth (sem bottom nav)
  - `NotFound.tsx` — página 404 standalone
  - `Index.tsx` — apenas redireciona
- Saída amigável:
  ```
  ✅ 47 páginas OK
  ❌ 2 páginas sem `mb-mobile-nav`:
     - src/pages/FooPage.tsx
     - src/pages/BarPage.tsx
  ```
- Exit code `1` em caso de falha (quebra CI)

**2. Integração no `package.json`**
- Novo script: `"check:mobile-nav": "node scripts/check-mobile-nav.mjs"`
- Encadeado em `lint` ou `prebuild` para rodar a cada build/CI

**3. Integração no GitHub Actions**
- Adicionar passo `npm run check:mobile-nav` no workflow de CI existente, antes de `build`/`test`
- Falha do script bloqueia merge

**4. Documentação curta** — append em `docs/LAYOUTS.md`
- Seção "Mobile Layout Checklist" explicando a regra e como adicionar exceções à allowlist

### Detalhes técnicos

- Node ESM puro (`.mjs`), sem dependências novas (usa `fs`, `path`, `glob` via `fs.readdirSync` recursivo)
- Heurística: regex `/mb-mobile-nav/` no conteúdo do arquivo (suficiente — classes são strings literais Tailwind)
- Allowlist em constante no topo do script para fácil manutenção
- Performance: <100ms para varrer ~50 páginas

### Arquivos editados/criados

- ➕ `scripts/check-mobile-nav.mjs`
- ✏️ `package.json` (novo script + hook em `prebuild`)
- ✏️ `.github/workflows/*.yml` (adicionar passo, se workflow existir)
- ✏️ `docs/LAYOUTS.md` (seção de checklist)

### Memória a salvar

Nova entrada em `mem://standards/mobile-nav-checklist` referenciando o script — para que futuras refatorações saibam da regra automatizada. Index.md será atualizado.

