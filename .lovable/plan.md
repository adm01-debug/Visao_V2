

## Checklist de validação automatizada pós-skeletons

Adicionar um script único que roda em sequência os gates relevantes para garantir que as trocas de skeleton em **Câmeras**, **Alertas** e **Zonas** não introduzam regressões de tipo, imports órfãos ou layout.

### O que será criado

**1. Novo script** `scripts/validate-skeletons.mjs`

Pipeline sequencial (falha em qualquer etapa):

| # | Etapa | Comando interno | Falha se… |
|---|---|---|---|
| 1 | TypeScript estrito | `tsc --noEmit -p tsconfig.json` | qualquer erro TS |
| 2 | Lint nas páginas-alvo | `eslint --max-warnings 0 src/pages/{Cameras,Alerts,Zones}Page.tsx src/components/skeletons/**` | qualquer warning/erro |
| 3 | Imports não-usados focados | regex sobre `Skeleton`, `CamerasSkeleton`, `AlertsSkeleton`, `ZonesSkeleton`, `FiltersBarSkeleton`, `TabsSkeleton` nos arquivos editados — flag se importado e nunca referenciado no JSX | qualquer match órfão |
| 4 | Mobile-nav gate | reusar `npm run check:mobile-nav` | regressão `mb-mobile-nav` |
| 5 | Build de produção | `vite build` | falha de build / chunk |

Saída humana clara: `✓` por etapa + resumo final com tempo total. Em falha, imprime apenas o output da etapa quebrada e sai com código `1`.

**2. Novo entry no `package.json`**

```json
"scripts": {
  "check:skeletons": "node scripts/validate-skeletons.mjs"
}
```

Não substitui gates existentes; é um **pré-flight focado** rodável manualmente ou via Husky `pre-push` (opcional, fora do escopo).

**3. Documentação curta** em `docs/SKELETON_VALIDATION.md`

- Quando rodar: após qualquer alteração em `src/components/skeletons/**` ou nas três páginas.
- Como interpretar cada falha (mapa erro → arquivo provável).
- Comando de fallback para reproduzir cada etapa isoladamente.

### Critérios de aceitação

- `npm run check:skeletons` executa as 5 etapas em < 60s e termina com `✓ All skeleton checks passed`.
- Se introduzir um import órfão de `Skeleton` em qualquer arquivo do alvo, etapa 3 falha com nome do arquivo + símbolo.
- Se um TS error reaparecer (ex.: prop `loading` removida de `AlertStatsCards`), etapa 1 falha apontando linha exata.
- Mobile-nav gate continua independente e verde.
- Nenhum gate existente é alterado — é apenas um agregador adicional.

### Arquivos a criar/editar

- ➕ `scripts/validate-skeletons.mjs` (novo, ~80 linhas, Node ESM puro, sem dependências extras)
- ✏️ `package.json` — adicionar `"check:skeletons"` em `scripts`
- ➕ `docs/SKELETON_VALIDATION.md` (novo, ~30 linhas)

### Riscos

- **Risco:** ESLint focado em paths específicos pode mascarar erros em arquivos não listados.
  - **Mitigação:** etapa 1 (`tsc` global) já cobre o resto do projeto; o lint focado é complementar para feedback rápido.
- **Risco:** detector de imports órfãos via regex pode dar falso-positivo se símbolo for usado em string template ou comentário.
  - **Mitigação:** procurar matches **fora** das linhas de `import`, em padrões `<Símbolo` ou `Símbolo(`/`Símbolo.` — ignorar comentários `//` e strings.
- **Risco:** `vite build` é lento (~30s) e pode tornar o script tedioso.
  - **Mitigação:** flag opcional `--skip-build` para iteração rápida; pipeline completo continua sendo o default.

