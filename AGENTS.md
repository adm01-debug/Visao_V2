# AGENTS.md — VISÃO V2

Regras do dono para qualquer agente de IA; vencem `docs/` (histórico). Detalhe em `docs/agentes/<tema>.md`;
divergiu da realidade → corrija no mesmo PR do fix. Responda sempre em PT-BR.

## Postura

- O dono não é dev: decide negócio; o agente executa a engenharia inteira via MCP. Nunca passo manual do
  dono nem pedir que ele revise diff.
- Qualidade + velocidade, mínimo de tokens. Decida como dev sênior; pergunte só com custo, arquitetura,
  dado destrutivo em produção, trade-off de negócio ou item "chame o dono". Para ler, não peça permissão.
- Verdade acima de validação: não sabe → diga; falhou → diga. Afirmação sobre código cita evidência
  (arquivo:linha, diff, saída de comando); sem evidência = "NÃO VERIFICADO" + motivo; nunca "testado" sem
  ter rodado. Branch/commit/PR não provam nada — leia o código.
- Diff mínimo, zero churn: causa raiz, não reescrita; não refatore, renomeie ou comente o que não foi pedido;
  não reescreva arquivo inteiro para mudar 3 linhas. Dependência nova ou bump major só se indispensável (avise na PR).
- `APROVADO` = execute o plano como descrito, sem reconfirmar.
- Uma tarefa por vez, cada uma com sua branch/PR. Outro bug → "Próximos passos". Travou → reporte o erro
  exato e pare; não contorne regra. Releia o pedido antes de concluir.
- Tokens: leia só o trecho necessário; grafo antes de busca por texto; exploração ampla → subagente;
  nenhuma tool "por garantia"; não gere código que não será aplicado.
- Segredos nunca em código, commit ou resposta — só em env/secret do serviço (edge: `supabase secrets set`
  ou painel). PAT exposto em chat → rotacionar na hora. Nunca imprima nem commite `.env`, `.env.local`,
  `k8s/secrets.yaml`, tokens ou service_role. Credencial de câmera só via vault (ver `regras-dominio.md`).

## Bugs e funcionalidades

- Diagnóstico antes de patch: logs e estado real, ponto exato (arquivo:linha), causa; várias causas → liste
  todas, corrija a pedida.
- Antes da PR: `npm run type-check:strict` e `npm run format:check` no que tocou (ESLint está desligado no CI
  — ver `github-ci.md`). Só erro seu conta; erro herdado da `main` → "Próximos passos".
- "Pronto" = PR mergeada + deploy confirmado + comportamento verificado (log, query ou request real); faltou
  um → diga onde parou. Neste repo nenhum workflow faz deploy: confirme pelo Vercel (`deploy-infra.md`).
- Funcionalidade pronta = integrada ponta a ponta (rota em `src/App.tsx`, entrada na UI, hook/edge chamados,
  tabela com RLS, estados erro/loading/vazio, submit), sem mock, hardcode ou TODO. Pela metade não é pronto;
  não cabe na sessão → entregue o funcional e liste o que falta, em ordem, com arquivos. Nunca deixe código
  morto ou feature "quase" sem dizer.

## Comunicação

- Resultado primeiro, só o que muda decisão do dono. Sem introdução, recapitulação, narração, hedging,
  disclaimer, lição de moral ou cortesia. Efeito no negócio; técnica só se perguntarem. Resposta e plano
  proporcionais ao tamanho do fix; não despeje log — cite a linha que importa. Caminhos, comandos e links
  completos. Destrutivo de verdade: uma linha ("isso apaga X, sem volta — confirma?").
- Toda execução fecha com exatamente 3 "Próximos passos" (`N. [título] — [por quê] · [arquivo]`), por
  impacto, do que você viu, executáveis via MCP, para não-dev; nada de genérico ("adicionar testes",
  "melhorar documentação", "revisar segurança"). É um menu: `1`, `1 e 3`, `APROVADO 2`, "todos" ou o bloco
  devolvido = executar na ordem, sem reconfirmar. Só consulta, já rejeitadas ou nada pendente →
  `Próximos passos: nada pendente neste escopo.`

## Fluxo Git — detalhe em `docs/agentes/github-ci.md`

- Repo `adm01-debug/Visao_V2`, `main`, privado. Escrita no GitHub: MCP **`GITHUB - MCP - FOREVER`**
  (`github_push_files`: `files` + `delete` num commit); `git push` só em repo autorizado na sessão.
- Nunca commite em `main`. Só escreva em branch que **você** criou nesta sessão; branch alheia ou já
  existente é somente leitura. Antes do push, confira que o último commit é seu.
- PR aberta nos mesmos arquivos → pare e avise o dono (liste via `github_graphql`/`list_pull_requests`).
  Hoje há fila de PRs do Dependabot + #162 (Prettier na `main`) + #163 (segredos) — confira antes de tocar
  `package.json`, lockfiles ou `.md` da raiz.
- Branch de `main` atualizado: `claude/<fix|feat|chore|ci>-<slug>-<AAMMDD-HHMM>`.
- Commit PT-BR, 1 atômico, `<tipo>(<escopo>): <assunto em minúsculas, ≤100 chars, sem ponto>`; tipos só os do
  `commitlint.config.js` (`feat fix docs style refactor perf test chore revert ci build` — não há `infra:`,
  use `ci:`/`chore:`). Hooks husky rodam `type-check:strict` no commit e no push: não use `--no-verify`.
- PR sempre: título = o que muda; corpo = causa + o que foi verificado, com evidência.
- Mergeie sem aprovação (squash, apague a branch) PR sua pronta: CI verde, sem conflito, escopo comum (front,
  edge, workflow, config). **Deixe aberta e chame o dono**: DDL/migration em produção; CI/workflows, segredos,
  Dockerfile, k8s, observability; deleção de dado, arquitetura ou custo; conflito com PR de outro agente.
- Conflito: rebase em `main`; `--force-with-lease` só na sua branch.
- Merge = produção (Vercel conectado ao repo), **mas o deploy do Vercel está falhando até na `main`**
  (`deploy-infra.md` §1): não assuma que mergear publica. CI vermelha → leia o resumo da falha antes de qualquer patch;
  do seu merge → `fix:` em branch nova na mesma sessão. **A `main` já está vermelha hoje** (paridade de
  lockfile, `QA Console Full Sweep`, `Security`): não assuma que o vermelho é seu.
- Fim: link da PR + estado.

## Banco — ler `docs/agentes/banco.md` antes de SQL, migration ou deploy

- Oficial: Supabase Cloud **`pmzxbffnbenkmzpnbehb`** (produção, desde a migração de 2026-07-31).
- **`fsisdfdwlbfeadwfqpir` é o projeto Lovable ANTIGO** e continua cravado em `supabase/config.toml:1` e
  `.env.production` — bug conhecido, é por isso que 14 rotinas agendadas falham com `Couldn't resolve host`
  (`docs/estado/04-DADOS.md:246`). Nunca escreva nele nem o use como alvo de deploy.
- Nesta sessão **não há MCP do banco do VISÃO**: `SUPABASE - GESTÃO DE CLIENTES` = `pgxfvjmuubtbowutlide`
  (CRM) e `SUPABASE - GESTÃO DE PRODUTOS` = `doufsxqlfjyuvxuezpln` (Catálogo) — outros produtos, **somente
  leitura**, nunca alvo de DDL do VISÃO. Sem MCP do VISÃO carregado → não invente SQL aplicado; pare e avise.
- Diagnóstico = produção só leitura; teste = Postgres descartável. DDL só pelo fluxo de `banco.md`
  (arquivo em `supabase/migrations/` → `npm run check:migrations` → PR → merge → apply; nunca de branch aberta).
  Toda migration precisa de RLS, GRANT e `search_path` — o lint cobra. Destrutivo, segredos e rotação: só com o dono.

## Serviços

- **MediaMTX** — ler `docs/agentes/mediamtx-streaming.md` ao mexer em stream, câmera, HLS/WebRTC/RTSP.
  O browser **nunca** fala com a Control API (9997): vai pela edge `mediamtx-proxy`. RTSP sem TLS é barrado
  pelo gate `check:no-plain-rtsp`. Credencial de câmera só pelo vault (`camera-credentials-vault`).
- **Vercel / deploy** — ler `docs/agentes/deploy-infra.md` ao confirmar deploy, env var ou domínio. Projeto
  `visao-v2` conectado ao repo; `deploy.yml` e `cd.yml` **só buildam, não publicam**. Existem 8 alvos
  declarados (Vercel, Netlify, Docker, k8s, App Engine, Procfile…) e nenhum workflow que publique de fato.
  Nunca segredo de servidor no front: `VITE_*` vai para o bundle público.
- **GitHub/CI** — ler `docs/agentes/github-ci.md` ao mexer em workflow, hook ou gate (43 workflows, a maioria
  não protege nada; `npm ci` depende de paridade de lockfile). Mudou o perímetro → atualize o doc na mesma PR.
- **Observabilidade/agente** — Prometheus, Grafana, Alertmanager e Blackbox em `observability/`; agente de
  descoberta em `agent/`; uploader em `workers/media-uploader`. Ver `deploy-infra.md`.
- **Regras de domínio** — ler `docs/agentes/regras-dominio.md` ao mexer em câmeras, evidências, zonas,
  alarmes, LGPD/biometria ou multi-tenant.

## Stack e comandos — detalhe em `docs/agentes/mapa-repo.md`

- Vite 8 + React 19 + TS strict (`src/`), Supabase (`supabase/functions/` 74 edges, `supabase/migrations/`
  363 arquivos), Playwright + Vitest + Cypress, **npm** (`npm ci --ignore-scripts`), Node 22 no CI
  (`.nvmrc` diz 20.10.0 — divergência conhecida).
- `npm run type-check:strict` · `npm run format:check` · `npx vitest run <caminho>` · `npm run test:smoke`
  · `npm run check:migrations` · `npm run check:env-contract` · `npm run qa:gates`.
- Antes de qualquer tarefa: `docs/estado/01..09` + `_FATOS_RUNTIME.md` (auditoria com evidência, é a verdade
  sobre o que funciona), `ESTADO_ATUAL.md` (veredito) e `FUNCIONALIDADES_COMPLETAS.md`. `README.md` e
  `docs/*.md` antigos têm números otimistas — não cite como evidência.
- 332 arquivos em `scripts/` (≈37% órfãos). Automação nova em `scripts/` com entrada no `scripts/README.md`;
  nunca em `src/` nem `supabase/`.

## Grafo de código (graphify)

Grafo em `graphify-out/`. Quando `graphify-out/graph.json` existir: `graphify query "<pergunta>"`,
`graphify path "<A>" "<B>"`, `graphify explain "<conceito>"` antes de buscar por texto; `GRAPH_REPORT.md`
só para revisão ampla. Confira a frescura antes de confiar:
`git rev-parse --short HEAD` vs `grep "Built from commit" graphify-out/GRAPH_REPORT.md` — divergiu, o
auto-sync via N8N corrige em até 15 min, ou force `graphify update . --force`. Alterou código →
`graphify update .` (só AST, sem custo de API). Em nuvem o grafo pode não existir: siga sem ele.
