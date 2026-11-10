# Code Quality Rules — VISÃO

Convenções práticas para manter o código alinhado às regras estritas de ESLint
(`unused-imports`, `@typescript-eslint/no-unused-vars`) e TypeScript
(`noUnusedLocals`, `noUnusedParameters`, `exactOptionalPropertyTypes`).

> Princípio geral: **prefira corrigir a causa-raiz** antes de silenciar a regra.
> Toda supressão precisa de justificativa em comentário.

---

## 1. Prefixo `_` para variáveis intencionalmente não usadas

A regra do ESLint (`unused-imports/no-unused-vars`) e do TS (`noUnusedParameters`)
estão configuradas para **ignorar identificadores que começam com `_`**:

```json
// eslint.config.js
'unused-imports/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }]
```

### ✅ Quando USAR `_`

| Cenário                                                                                | Exemplo                                                                   |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| **Parâmetro obrigatório por assinatura** (callback de lib externa, override de método) | `array.map((_item, index) => index * 2)`                                  |
| **Argumento de RPC/função RLS** que precisa ter nome convencional                      | `has_role(_user_id: string, _role: AppRole)`                              |
| **Destructuring para descartar campo**                                                 | `const { password: _password, ...safe } = user;`                          |
| **Tipo discriminado em `switch` exaustivo**                                            | `case 'unknown': { const _exhaustive: never = action; return null; }`     |
| **Hook do React onde a dependência é exigida mas o valor não é lido**                  | `useEffect(() => { setup(); }, [_unusedFlag])` (raro — prefira refatorar) |

### ❌ Quando NÃO usar `_`

- ❌ "Variável que vou usar daqui a pouco" → **remova até precisar**.
- ❌ "Estou debugando" → use `console.log` temporário, não polua a assinatura.
- ❌ "O lint está chato" → veja seção 3 (justificativa de exceção).
- ❌ Em **export público** (`export const _foo`): se está exportado, não pode ser "não usado".

### Exemplos completos

```ts
// ✅ Bom: callback de Supabase realtime — payload não é lido aqui
supabase
  .channel('alerts')
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'alerts' }, (_payload) =>
    refetchAlerts()
  )
  .subscribe();

// ✅ Bom: type guard exaustivo
function handleAlertType(type: AlertType) {
  switch (type) {
    case 'security':
      return '🔴';
    case 'safety':
      return '🟡';
    case 'access':
      return '🔵';
    default: {
      const _exhaustive: never = type; // garante que todos os enums foram tratados
      return '⚪';
    }
  }
}

// ❌ Ruim: prefixo só para silenciar lint sem motivo semântico
function calculateScore(_cameras: Camera[], alerts: Alert[]) {
  return alerts.length * 10; // se não usa cameras, REMOVA do parâmetro
}

// ✅ Refatoração correta
function calculateScore(alerts: Alert[]) {
  return alerts.length * 10;
}
```

---

## 2. `eslint-disable-next-line` — uso pontual e justificado

### Regras de ouro

1. **Sempre `eslint-disable-next-line`**, nunca `/* eslint-disable */` em bloco
   sem `/* eslint-enable */` na mesma função.
2. **Sempre cite a regra específica**: `// eslint-disable-next-line no-console`.
   Nunca `// eslint-disable-next-line` (genérico).
3. **Sempre adicione justificativa na mesma linha ou linha acima**:
   `// eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only effect, ver issue #234`.
4. **Tem prazo?** Adicione `TODO(YYYY-MM-DD)` ou link de issue.

### Casos legítimos comuns

#### a) `react-hooks/exhaustive-deps` — efeito de montagem único

```tsx
useEffect(() => {
  // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only: telemetria não deve repetir
  trackPageView('/dashboard');
}, []);
```

#### b) `no-console` — logger fallback em código de bootstrap

```ts
try {
  initLogger();
} catch (err) {
  // eslint-disable-next-line no-console -- logger ainda não inicializou
  console.error('[bootstrap] logger init failed:', err);
}
```

#### c) `@typescript-eslint/no-explicit-any` — tipagem de lib externa sem types

```ts
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- @types/face-api ausente, ver #312
const detector = (faceapi as any).createDetector(model);
```

#### d) `unused-imports/no-unused-imports` — import com side effect

```ts
// eslint-disable-next-line unused-imports/no-unused-imports -- side effect: registra polyfill global
import 'core-js/features/array/at';
```

> Para side effects, **prefira** mover o import para `vite.config.ts` (`optimizeDeps.include`)
> ou para `src/main.tsx` no topo, onde o uso é evidente pelo contexto.

### ❌ Anti-padrões

```ts
// ❌ Sem regra específica
// eslint-disable-next-line
const x: any = JSON.parse(data);

// ❌ Sem justificativa
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const config: any = loadConfig();

// ❌ Bloco gigante sem enable
/* eslint-disable */
function legacyCode() {
  // ...300 linhas
}

// ❌ "Vou consertar depois" sem prazo nem issue
// eslint-disable-next-line react-hooks/exhaustive-deps -- TODO consertar
useEffect(() => fetchData(filters), []);
```

---

## 3. Como justificar uma exceção (template)

Quando precisar suprimir uma regra, siga este formato:

```ts
// eslint-disable-next-line <regra-completa> -- <motivo curto> (<referência>)
```

| Componente                |  Obrigatório   | Exemplo                                                          |
| ------------------------- | :------------: | ---------------------------------------------------------------- |
| Regra completa com plugin |       ✅       | `react-hooks/exhaustive-deps`, `unused-imports/no-unused-vars`   |
| Motivo em 1 linha         |       ✅       | `mount-only effect`, `lib externa sem types`, `legacy migration` |
| Referência                | ⚠️ recomendado | `ver #234`, `RFC-007`, `TODO(2026-Q3)`                           |

### Para suprimir TypeScript (`@ts-expect-error` > `@ts-ignore`)

```ts
// ✅ Preferido: falha se o erro for corrigido (auto-cleanup)
// @ts-expect-error -- biblioteca X não exporta tipo Y, ver #456
import { internalApi } from 'lib-x/internal';

// ❌ Evitar: silencia indefinidamente sem feedback
// @ts-ignore
import { internalApi } from 'lib-x/internal';
```

> Política: `@ts-ignore` está **proibido em `src/`** (memória `architecture/typescript-governance`).
> Use `@ts-expect-error` com justificativa, ou refatore.

---

## 4. Fluxograma de decisão

```
Tenho uma variável/import/parâmetro que o lint reclama
         │
         ▼
   Posso REMOVER?  ── Sim ──► Remover
         │
         Não (necessário pela assinatura ou side effect)
         │
         ▼
   É um parâmetro/var local sem uso semântico?
         │
         ├── Sim ──► Prefixar com `_` (seção 1)
         │
         Não (regra ESLint específica está bloqueando uso legítimo)
         │
         ▼
   Tenho justificativa documentável?
         │
         ├── Não ──► Refatorar para evitar a exceção
         │
         Sim
         │
         ▼
   `eslint-disable-next-line <regra> -- <motivo> (<ref>)` (seção 2)
```

---

## 5. Como auditar exceções existentes

```bash
# Listar todas as supressões de ESLint no código
grep -rn "eslint-disable" src/ tests/ supabase/functions/

# Listar supressões SEM justificativa (anti-padrão)
grep -rnE "eslint-disable-next-line\s+[a-z@/-]+\s*$" src/

# Listar @ts-expect-error sem justificativa
grep -rnE "@ts-expect-error\s*$" src/
```

Idealmente, rodar essas auditorias mensalmente ou adicionar como check no
`audit:deadcode` futuro.

---

## 6. Configuração de referência

| Regra                                   | Configuração atual                                               | Local                                |
| --------------------------------------- | ---------------------------------------------------------------- | ------------------------------------ |
| `unused-imports/no-unused-imports`      | `error`                                                          | `eslint.config.js`                   |
| `unused-imports/no-unused-vars`         | `error` com `argsIgnorePattern: '^_'`, `varsIgnorePattern: '^_'` | `eslint.config.js`                   |
| `noUnusedLocals` / `noUnusedParameters` | `true`                                                           | `tsconfig.strict.json`               |
| `exactOptionalPropertyTypes`            | `true`                                                           | `tsconfig.strict.json`               |
| `noPropertyAccessFromIndexSignature`    | `true`                                                           | `tsconfig.strict.json`               |
| Auto-fix em PRs                         | habilitado para `unused-imports`                                 | `.github/workflows/lint-autofix.yml` |
| Gates pre-commit/pre-push               | `lint:ci` + `type-check:strict`                                  | `.husky/{pre-commit,pre-push}`       |

---

## 7. Referências cruzadas

- [`docs/DEPENDENCY_AUDIT.md`](./DEPENDENCY_AUDIT.md) — knip e dead code
- [`docs/FILTER_SYSTEM.md`](./FILTER_SYSTEM.md) — padrão `useManagedFilters`
- `mem://standards/code-quality-logs` — uso de `console.log` com `import.meta.env.DEV`
- `mem://architecture/typescript-governance` — política `strict: true`, sem `any` ou `@ts-ignore` em `src/`
- `mem://project-management/refactoring-policy` — quando refatorar em vez de suprimir

---

## 8. Backlog de flags TypeScript desligadas (débito técnico)

As flags abaixo estão **temporariamente desligadas** em `tsconfig.strict.json`
para destravar feature work. Devem ser reativadas incrementalmente, uma de cada
vez, em PRs dedicados.

| Flag                                 | Status       | Estimativa de cleanup                                                              |
| ------------------------------------ | ------------ | ---------------------------------------------------------------------------------- |
| `exactOptionalPropertyTypes`         | ❌ desligada | ~40 ocorrências (props com `?:` vs `\| undefined`)                                 |
| `noPropertyAccessFromIndexSignature` | ❌ desligada | ~25 ocorrências (`obj.foo` → `obj['foo']` em record types)                         |
| `noUnusedLocals`                     | ❌ desligada | ~80 ocorrências (imports `React` não usados em arquivos JSX-only, vars `_*` órfãs) |

Mantidas ativas: `strict`, `noUnusedParameters`, `noImplicitReturns`,
`noUncheckedIndexedAccess`, `noFallthroughCasesInSwitch`, `noImplicitAny`,
`strictNullChecks`, `strictFunctionTypes`, `strictBindCallApply`,
`strictPropertyInitialization`, `noImplicitThis`, `alwaysStrict`.

Stories e tests (`**/*.stories.*`, `**/__tests__/**`, `**/*.test.*`,
`src/test/**`, `tests/e2e/**`) também ficam fora do `type-check:strict`
para o gate de build — eles continuam cobertos pelo `tsconfig.json` base.

---

_Última atualização: 2026-04-22_

## Compatibilidade do TypeScript com o ESLint

O compilador está fixado em TypeScript `6.0.2`, versão suportada pelo
`typescript-eslint` instalado. TypeScript 7 ainda não fornece a API JavaScript
esperada pelo parser e impede a inicialização do lint. As configurações estritas
de tipos e todas as regras de lint permanecem ativas.

Ao atualizar o compilador, confira a [faixa suportada pelo typescript-eslint](https://typescript-eslint.io/users/dependency-versions/)
e valide os dois lockfiles com `npm run check:lockfile-parity`, o lint e
`npm run type-check:strict` antes da integração.
