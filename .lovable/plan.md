

## Gate de build estrito no CI: TypeScript + Lint + Bundling

Hoje o `.github/workflows/ci.yml` já roda `tsc --noEmit`, `npm run lint` e `npm run build`, mas não há garantia de que esses passos **falhem o pipeline** em todos os cenários reais. Vamos endurecer o gate para que qualquer erro de tipos, lint ou bundling pare o build com erro claro e atribuição precisa.

### Diagnóstico do estado atual

Analisando `.github/workflows/ci.yml`:

| Passo | Comportamento atual | Problema |
|---|---|---|
| `npx tsc --noEmit` | Falha CI ✅ | OK, mas usa `tsconfig.json` (que **exclui** stories e testes) |
| `npm run lint` | Falha CI ✅ | OK, mas regras críticas estão como `warn` (não falham) |
| `npm run build` | Falha CI ✅ | OK em erros fatais, mas Vite não falha em warnings de bundling (chunks gigantes, imports circulares) |
| `Mobile Nav Overlap` | `continue-on-error: true` | Intencional (snapshots) — manter |

**Lacunas identificadas:**

1. **Lint permissivo** — `eslint.config.js` tem `no-console: 'warn'`, `@typescript-eslint/no-explicit-any: 'warn'`, `react-hooks/exhaustive-deps: 'warn'`, `visao/no-hardcoded-colors: 'warn'`. Em CI, warnings não falham. Resultado: regressões de qualidade passam silenciosamente.
2. **TSC não cobre tudo** — `tsconfig.json` exclui `*.stories.tsx`, `*.test.ts(x)` e `__tests__/**`. Erros de tipo nesses arquivos só aparecem em runtime.
3. **Build sem detecção de regressão de bundle** — Vite reporta chunks > 500kB como warning, não como erro. Sem orçamento (`build.chunkSizeWarningLimit` + check pós-build), regressões de tamanho passam.
4. **Sem fail-fast explícito** — atualmente os passos rodam em sequência; quando um falha, os subsequentes continuam (passos não dependentes). Falta `set -e` consistente e ordenação por custo (mais rápido primeiro).

### Mudanças

#### 1. `.github/workflows/ci.yml` — endurecer cada gate

Reordenar os passos do mais barato (lint) ao mais caro (build) para falhar rápido, e adicionar flags estritas:

```yaml
- name: TypeScript Strict Check (incluindo stories/tests)
  run: npx tsc --noEmit --project tsconfig.strict.json

- name: ESLint (zero warnings)
  run: npm run lint -- --max-warnings=0

- name: Build (falha em chunks > 600kB)
  run: npm run build
  env:
    CI: true

- name: Bundle Size Check
  run: node scripts/check-bundle-size.mjs
```

- `--max-warnings=0` transforma warnings em erro de pipeline (sem mudar a config local de DX).
- `tsconfig.strict.json` (já existe!) cobre **todos** os arquivos, incluindo stories e testes — gate completo de tipos.
- Novo passo `Bundle Size Check` valida orçamento pós-build.

#### 2. `tsconfig.strict.json` — reaproveitar para cobertura total

O arquivo já existe com flags estritas, mas **herda** `tsconfig.json` que tem `exclude` de stories/tests. Vamos sobrescrever:

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": { /* já estrito */ },
  "include": ["src", "tests"],
  "exclude": ["node_modules", "dist"]
}
```

Resultado: `tsc --noEmit -p tsconfig.strict.json` valida **tudo**, incluindo arquivos hoje invisíveis ao gate.

#### 3. `package.json` — script auxiliar

```json
"type-check:strict": "tsc --noEmit -p tsconfig.strict.json",
"lint:ci": "eslint . --max-warnings=0",
"check:bundle-size": "node scripts/check-bundle-size.mjs"
```

Permite reproduzir localmente: `npm run type-check:strict && npm run lint:ci && npm run build && npm run check:bundle-size`.

#### 4. `scripts/check-bundle-size.mjs` — orçamento de bundle

Script novo que lê `dist/assets/*.js` e falha se:
- Qualquer chunk individual > **600 kB** (gzipped > 200 kB).
- Soma total dos chunks JS > **2 MB** (gzipped > 700 kB).

```js
import { readdirSync, statSync, readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join } from 'node:path';

const LIMITS = {
  perChunk: 600 * 1024,      // 600 KB raw
  perChunkGz: 200 * 1024,    // 200 KB gzipped
  totalJs: 2 * 1024 * 1024,  // 2 MB raw
  totalJsGz: 700 * 1024,     // 700 KB gzipped
};

const dir = 'dist/assets';
const files = readdirSync(dir).filter((f) => f.endsWith('.js'));
const errors = [];
let totalRaw = 0, totalGz = 0;

for (const f of files) {
  const buf = readFileSync(join(dir, f));
  const raw = buf.length;
  const gz = gzipSync(buf).length;
  totalRaw += raw; totalGz += gz;
  if (raw > LIMITS.perChunk) errors.push(`Chunk ${f}: ${(raw/1024).toFixed(0)}KB > ${LIMITS.perChunk/1024}KB`);
  if (gz > LIMITS.perChunkGz) errors.push(`Chunk ${f} gz: ${(gz/1024).toFixed(0)}KB > ${LIMITS.perChunkGz/1024}KB`);
}
if (totalRaw > LIMITS.totalJs) errors.push(`Total JS: ${(totalRaw/1024/1024).toFixed(2)}MB > ${LIMITS.totalJs/1024/1024}MB`);
if (totalGz > LIMITS.totalJsGz) errors.push(`Total JS gz: ${(totalGz/1024).toFixed(0)}KB > ${LIMITS.totalJsGz/1024}KB`);

if (errors.length) {
  console.error('❌ Bundle size budget exceeded:\n' + errors.join('\n'));
  process.exit(1);
}
console.log(`✅ Bundle OK — ${files.length} chunks, ${(totalRaw/1024/1024).toFixed(2)}MB raw / ${(totalGz/1024).toFixed(0)}KB gz`);
```

Os limites refletem o estado atual + margem; ajustáveis se a primeira execução falhar (calibrar para o tamanho real, não inflacionado).

#### 5. `.husky/pre-push` — espelhar o gate de CI localmente

Hoje `pre-push` roda `npm run test:ci && npm run lint`. Adicionar:
```sh
npm run type-check:strict
npm run lint:ci
npm run build
npm run check:bundle-size
```

Garante que devs vejam falhas antes do push, não só no CI.

#### 6. Documentação

- **`docs/CI-CD.md`** — adicionar seção "Build Gates Estritos" listando os 4 gates (TS strict, lint zero-warnings, build, bundle budget) e como reproduzir localmente.
- **`mem://architecture/ci-cd-and-e2e-integrity-standards`** — atualizar mencionando os novos gates e os scripts `type-check:strict`, `lint:ci`, `check:bundle-size`.

### Validação pós-implementação

1. `npm run type-check:strict` local — confirmar que passa (ou listar erros legítimos a corrigir antes de habilitar o gate).
2. `npm run lint:ci` local — pode falhar inicialmente se houver warnings acumulados; resolver antes de mergear.
3. `npm run build && npm run check:bundle-size` — valida orçamento atual; calibrar limites se necessário.
4. Regressão proposital: introduzir `let x: any = 1` em um componente → `lint:ci` deve falhar com mensagem clara apontando o arquivo.
5. Regressão proposital: importar `xlsx` (pacote pesado) sem dynamic import → `check-bundle-size` deve falhar com chunk acima de 600 kB.

### Plano de rollout em 2 fases (mitigação de risco)

**Fase A — habilitar gates em modo report-only** (este plano):
- Adicionar todos os passos com `continue-on-error: true` apenas para `lint:ci` e `check:bundle-size` na primeira execução.
- Coletar baseline de warnings/tamanhos reais.

**Fase B — endurecer (segunda PR)**:
- Remover `continue-on-error`, fixar limites calibrados.
- Atualizar memória registrando os limites como contrato.

Como o usuário pediu "falhar quando houver erros", **vamos direto à Fase B** (sem report-only). Se houver muitos warnings legados, ajustamos o plano para corrigir antes de habilitar. A validação local (passo 2 acima) é o ponto de decisão.

### Arquivos editados/criados

- ➕ `scripts/check-bundle-size.mjs` — novo script de orçamento
- ✏️ `.github/workflows/ci.yml` — passos endurecidos + novo passo de bundle
- ✏️ `tsconfig.strict.json` — incluir `tests/`, sobrescrever `exclude`
- ✏️ `package.json` — scripts `type-check:strict`, `lint:ci`, `check:bundle-size`
- ✏️ `.husky/pre-push` — espelhar gate local
- ✏️ `docs/CI-CD.md` — seção "Build Gates Estritos"
- ✏️ `.lovable/memory/architecture/ci-cd-and-e2e-integrity-standards.md` — registrar gates

### Riscos

- **Risco:** `tsc -p tsconfig.strict.json` cobrindo stories/tests pode revelar erros de tipo legados.
  - **Mitigação:** rodar localmente primeiro; se houver, corrigir como pré-requisito ou adicionar `// @ts-expect-error` pontual com comentário.
- **Risco:** `lint --max-warnings=0` pode falhar em warnings legados (`no-console`, `no-explicit-any`, `exhaustive-deps`).
  - **Mitigação:** rodar `npm run lint -- --max-warnings=0` local antes de habilitar; corrigir ou justificar com `eslint-disable-next-line` + motivo.
- **Risco:** limites de bundle muito apertados quebram o build em features novas legítimas.
  - **Mitigação:** calibrar com baseline real + 15% de margem; documentar como ajustar limites quando houver crescimento justificado.
- **Risco:** `pre-push` com build completo fica lento (~30-60s).
  - **Mitigação:** se incomodar, mover `build` + `check:bundle-size` apenas para CI e manter só `type-check:strict` + `lint:ci` no `pre-push`.

