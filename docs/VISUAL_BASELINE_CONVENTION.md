# Convenção de Baselines Visuais

Padronização da organização e naming dos screenshots de regressão visual no Playwright.

## Estrutura no disco

```
tests/e2e/__screenshots__/
├── <spec-name>/                       # nome do .spec.ts sem extensão
│   ├── <project-name>/                # mobile-safari, mobile-chrome, chromium, ...
│   │   ├── <route>/
│   │   │   ├── fullpage.png
│   │   │   ├── bottom-strip.png
│   │   │   └── header.png
│   │   └── <route>/
│   │       └── ...
```

Exemplo real:

```
tests/e2e/__screenshots__/
└── mobile-nav-visual/
    ├── mobile-safari/
    │   ├── dashboard/
    │   │   ├── fullpage.png
    │   │   └── bottom-strip.png
    │   ├── heatmap/
    │   │   ├── fullpage.png
    │   │   └── bottom-strip.png
    │   └── alerts-timeline/
    │       └── fullpage.png
    └── mobile-chrome/
        └── dashboard/
            └── fullpage.png
```

Configurado em `playwright.config.ts` via:

```ts
snapshotPathTemplate: '{testFileDir}/__screenshots__/{testFileName}/{projectName}/{arg}{ext}'
```

## Naming via helper

Sempre use `snapshotName()` em vez de strings ad-hoc:

```ts
import { snapshotName, routeToSlug } from './helpers/snapshotName';

await expect(page).toHaveScreenshot(
  snapshotName({ route: routeToSlug('/dashboard'), variant: 'fullpage' }),
  { fullPage: true, ... },
);
```

Regras:
- `route`: kebab-case derivado do path (`/license-plate` → `license-plate`, `/` → `root`).
- `variant`: tipo de captura (`fullpage`, `bottom-strip`, `header`, `drawer-open`).
- `viewport` (opcional): apenas quando o spec varia resolução dentro do mesmo project.
  Resulta em sufixo `@<viewport>` (ex.: `dashboard/fullpage@iphone-414.png`).
- Nunca incluir browser/platform no nome — `{projectName}` na pasta cuida disso.

## Vantagens

1. **Hierarquia visual**: `mobile-safari/dashboard/` é auditável de relance, sem
   parsear nomes longos.
2. **Diff entre viewports**: compare diretamente
   `__screenshots__/<spec>/mobile-safari/dashboard/` vs `mobile-chrome/dashboard/`.
3. **Atualização cirúrgica**: `git checkout` ou `--update-snapshots --grep="dashboard"`
   afeta exatamente uma rota/project, não polui outras.
4. **Sem suffix de plataforma no arquivo**: força disciplina de rodar baselines
   em ambiente reproduzível (CI Linux).

## Atualização

```bash
# Atualizar todos os baselines do spec:
npx playwright test mobile-nav-visual --project=mobile-safari --update-snapshots

# Atualizar apenas uma rota:
npx playwright test mobile-nav-visual --project=mobile-safari \
  --grep="dashboard" --update-snapshots

# Modo automático completo (env flag):
UPDATE_VISUAL_BASELINES=1 npm run test:mobile-nav-visual
```

## Auditoria em PR

Reviewers devem inspecionar diffs PNG por pasta:

```bash
git diff --stat tests/e2e/__screenshots__/mobile-nav-visual/mobile-safari/dashboard/
```

A estrutura facilita identificar mudanças por rota sem abrir cada PNG.

## Migração da estrutura legada

Estrutura antiga (`<spec>-snapshots/<arg>-<project>-<platform>.png`) será
substituída automaticamente quando os baselines forem regerados via
`--update-snapshots`. Não é necessário renomear manualmente.
