# 🔄 CI/CD Guide - Projeto VISÃO

## Visão Geral

Pipeline de integração e deploy contínuo com GitHub Actions.

---

## 1. Workflows

### CI - Integração Contínua

| Workflow       | Trigger       | Ação              |
| -------------- | ------------- | ----------------- |
| `ci.yml`       | PR, push main | Build, lint, test |
| `lint.yml`     | PR            | ESLint, Prettier  |
| `test.yml`     | PR, push      | Vitest            |
| `e2e.yml`      | PR main       | Cypress           |
| `coverage.yml` | push main     | Cobertura         |

### CD - Deploy Contínuo

| Workflow       | Trigger   | Destino        |
| -------------- | --------- | -------------- |
| `preview.yml`  | PR        | Vercel Preview |
| `deploy.yml`   | push main | Production     |
| `rollback.yml` | manual    | Rollback       |

---

## 2. CI Workflow

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Type Check
        run: npm run typecheck

      - name: Test
        run: npm run test

      - name: Build
        run: npm run build
```

---

## 3. Deploy Workflow

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

---

## 4. Secrets Necessários

| Secret              | Uso            |
| ------------------- | -------------- |
| `VERCEL_TOKEN`      | Deploy Vercel  |
| `VERCEL_ORG_ID`     | Org Vercel     |
| `VERCEL_PROJECT_ID` | Projeto Vercel |
| `SUPABASE_URL`      | Database       |
| `SUPABASE_ANON_KEY` | Auth           |
| `CODECOV_TOKEN`     | Cobertura      |

---

## 5. Branch Protection

```yaml
main:
  - Require PR review
  - Require status checks:
      - ci
      - lint
      - test
  - Require up-to-date
  - No force push
```

---

## 6. Ambientes

| Ambiente   | Branch  | URL               |
| ---------- | ------- | ----------------- |
| Production | main    | visao.app         |
| Staging    | staging | staging.visao.app |
| Preview    | PR      | pr-xxx.visao.app  |

---

## 7. Cache

```yaml
- name: Cache dependencies
  uses: actions/cache@v4
  with:
    path: ~/.npm
    key: npm-${{ hashFiles('**/package-lock.json') }}
```

---

## 8. Matrix Testing

```yaml
strategy:
  matrix:
    node: [18, 20]
    os: [ubuntu-latest, macos-latest]
```

---

## 9. Notificações

| Evento         | Canal           |
| -------------- | --------------- |
| Build failed   | Slack #dev      |
| Deploy success | Slack #releases |
| Security alert | Email           |

---

## 10. Comandos Úteis

```bash
# Executar workflow local
act push

# Ver status
gh run list

# Ver logs
gh run view <id> --log
```

---

## 11. Build Gates Estritos

O pipeline falha **explicitamente** em qualquer um dos 4 gates abaixo. Eles rodam ordenados por custo crescente para falhar rápido.

| #   | Gate               | Comando                     | O que valida                                                                        |
| --- | ------------------ | --------------------------- | ----------------------------------------------------------------------------------- |
| 1   | TypeScript estrito | `npm run type-check:strict` | Tipos em `src/` **e** `tests/` (stories/tests incluídos via `tsconfig.strict.json`) |
| 2   | Lint zero-warnings | `npm run lint:ci`           | ESLint com `--max-warnings=0` — qualquer warning vira erro                          |
| 3   | Build de produção  | `npm run build`             | Vite build completo (inclui `check:mobile-nav` como prebuild)                       |
| 4   | Bundle budget      | `npm run check:bundle-size` | Chunks ≤ 600 KB raw / 200 KB gz; total ≤ 2 MB raw / 700 KB gz                       |

### Reproduzir localmente

```bash
npm run type-check:strict && npm run lint:ci && npm run build && npm run check:bundle-size
```

O `.husky/pre-push` executa exatamente esses 4 gates antes de cada push, evitando que regressões cheguem ao CI.

### Ajustando o orçamento de bundle

Os limites em `scripts/check-bundle-size.mjs` (constante `LIMITS`) refletem o estado atual + ~15% de margem. Quando uma feature legítima exigir mais espaço:

1. Confirme que o crescimento é justificado (não é regressão de dynamic import).
2. Atualize `LIMITS` com o novo teto.
3. Documente o motivo no commit.

---

**Última atualização:** 21/04/2026
