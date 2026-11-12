# inventario/estado — leia isto antes de abrir código

Arquivos **gerados** (não edite à mão): saem de `scripts/inventario/` e são refeitos pelo workflow
`inventario-estado-semanal.yml`. Servem para responder, sem ler o repositório inteiro:

- `rotas.json` — toda URL do app: arquivo da página, se exige sessão, papel mínimo, item de menu
  correspondente e, por rota, quais **hooks, edge functions, RPCs, tabelas e buckets** ela usa.
  `problemas[]` lista item de menu apontando para rota inexistente, rota protegida fora do menu,
  rota sem arquivo e import local que não resolve.
- `edges.json` — cada edge function: linhas, segredos lidos (`Deno.env.get`) e quem a invoca.
  `sem_chamador_no_repo` = edge sem nenhuma chamada em `src/`, migrations ou outra edge (candidata a
  morta, ou chamada por fora: webhook, cron, agente).
- `banco.json` — banco oficial: tabelas com RLS/policies/triggers/linhas, `tabelas_orfas`, cron jobs
  com taxa de falha de 7 dias, buckets de storage e `alertas[]` (tabela sem RLS, RLS sem policy, cron
  falhando/parado, bucket público, edge sem deploy). Aparece a partir do primeiro run com o secret
  `SUPABASE_ACCESS_TOKEN`.

Como usar: comece por `problemas[]`/`alertas[]`; depois procure a rota ou a tabela pelo nome antes de
fazer grep no `src/`. Para regerar na hora, veja `scripts/inventario/README.md`.
