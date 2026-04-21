

## Endurecer ESLint + TypeScript para bloquear código não utilizado

Promover regras de "unused" de warning → error e ativar flags estritas no TypeScript, fazendo o build/CI quebrar quando código morto for introduzido. Resolver primeiro o erro de cache stale do `CoveragePage` que está bloqueando o build.

### Estado atual

- `eslint.config.js`: `unused-imports/no-unused-imports: 'error'` ✅ já ativo, mas `unused-imports/no-unused-vars: 'warn'` (não bloqueia).
- `tsconfig.json`: `noUnusedLocals: false`, `noUnusedParameters: false` → TS ignora vars/params órfãos.
- `tsconfig.strict.json` já tem `noUnusedLocals: true` e `noUnusedParameters: true`, mas **não é usado pelo `npm run build`** (só por `type-check:strict`).
- Build atual falhando com `ENOENT` em `src/components/coverage/CoverageStatsCards` — cache Vite stale (recorrente).
- `npm run lint:ci` já roda com `--max-warnings=0` no CI, então promover warn→error tem efeito imediato.

### Solução em 4 passos

**Passo 0 — Destravar build (pré-requisito)**

- `rm -rf node_modules/.vite dist`
- `touch src/components/coverage/*.tsx src/pages/CoveragePage.tsx`
- Validar `npm run build` passa antes de qualquer mudança de regra.

**Passo 1 — Promover regras ESLint para `error`**

Editar `eslint.config.js`:

| Regra | Antes | Depois |
|---|---|---|
| `unused-imports/no-unused-imports` | `error` | `error` (mantém) |
| `unused-imports/no-unused-vars` | `warn` | `error` (com `argsIgnorePattern: '^_'`, `varsIgnorePattern: '^_'`, `caughtErrorsIgnorePattern: '^_'`) |
| `@typescript-eslint/no-unused-vars` | `off` | `off` (mantém — substituído pelo plugin) |
| `no-console` | `warn` | `warn` (mantém — não é escopo desta rodada) |

**Passo 2 — Ativar flags estritas no `tsconfig.json` (build principal)**

Editar `tsconfig.json`:

```json
{
  "compilerOptions": {
    "noUnusedLocals": true,        // era false
    "noUnusedParameters": true     // era false
  }
}
```

Convenção `_` prefix já é respeitada pelo TS quando combinada com ESLint `argsIgnorePattern`.

**Passo 3 — Garantir gate no build**

- `vite.config.ts`: confirmar que erros TS não passam silenciosamente (Vite usa esbuild que não checa tipos; o gate real é `npm run type-check` no pre-push e CI).
- `.husky/pre-commit`: já roda `npm run lint` via lint-staged → agora bloqueará vars não usadas localmente.
- `.husky/pre-push`: já roda `type-check:strict` + `lint:ci` → continuará bloqueando.
- CI (`.github/workflows/ci.yml`): já roda `type-check:strict` + `lint:ci` → mudanças efetivas sem editar workflow.

**Passo 4 — Documentar convenções**

Criar `docs/CODE_QUALITY_RULES.md` explicando:
- Como silenciar intencionalmente (prefixo `_` em params, `_` em destructuring).
- Quando usar `// eslint-disable-next-line unused-imports/no-unused-vars` (raro, justificar em comentário).
- Como rodar `npx eslint --fix` para auto-correção.

### Critérios de aceitação

- ✅ `npm run build` passa
- ✅ `npx tsc --noEmit` (usa `tsconfig.json`) passa com `noUnusedLocals/Parameters: true`
- ✅ `npm run lint:ci` (com `--max-warnings=0`) passa
- ✅ `npx vitest run` mantém testes passando
- ✅ Tentar adicionar `const foo = 1;` sem uso → ESLint **erro** (não warning)
- ✅ Tentar adicionar `import { X } from 'y'` sem uso → ESLint **erro** + auto-fix remove
- ✅ `docs/CODE_QUALITY_RULES.md` criado

### Arquivos a editar

| Arquivo | Mudança |
|---|---|
| `eslint.config.js` | `unused-imports/no-unused-vars`: warn → error |
| `tsconfig.json` | `noUnusedLocals: true`, `noUnusedParameters: true` |
| `docs/CODE_QUALITY_RULES.md` | ➕ Criar |

### Riscos e mitigações

- **Risco:** ativar flags TS expõe N erros pré-existentes que travam o build.
  - **Mitigação:** rodar `npx tsc --noEmit` ANTES de commitar a mudança no `tsconfig.json`. Se houver erros, aplicar auto-fix com `npx eslint --fix` (já cobre maioria dos casos) e corrigir manualmente os restantes (renomear params para `_param`, remover vars mortas) em um único lote antes de ativar a flag.
- **Risco:** callbacks de libs (React event handlers, Supabase) com params não usados quebram.
  - **Mitigação:** convenção `_` prefix + `argsIgnorePattern: '^_'` no ESLint. TS respeita o mesmo padrão (params iniciados com `_` são ignorados nativamente por `noUnusedParameters`).
- **Risco:** cache Vite stale volta a quebrar build.
  - **Mitigação:** Passo 0 executado primeiro. Se reincidir durante validação, repetir `rm -rf node_modules/.vite`.
- **Risco:** lint-staged passa a falhar em commits com vars não usadas, irritando devs.
  - **Mitigação:** comportamento desejado — é o ponto da tarefa. Documentar em `CODE_QUALITY_RULES.md` como contornar legitimamente.

