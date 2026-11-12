# inventario — o estado REAL do projeto, gerado de comando

Quatro scripts sem dependência (Node ≥ 20, só `rg` para o de edges) que escrevem `inventario/estado/`.
Nada aqui é escrito à mão: tudo sai do código em `main` e do banco oficial. É o que um agente deve ler
ANTES de abrir arquivo, para não refazer o que já existe nem supor o que não existe.

| Script               | Escreve                                                                         | Lê de onde                                                                                                                                                                                     |
| -------------------- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `gerar-rotas.mjs`    | `inventario/estado/rotas.json`                                                  | `src/App.tsx` (rotas, lazy, ProtectedRoute/minRole, Navigate) + `src/components/navigation/bottomNavData.ts` (menu) + o fecho de imports de cada página (hooks, edges, RPCs, tabelas, buckets) |
| `gerar-repo.mjs`     | `inventario/estado/edges.json` (e `tabelas-uso.json` se receber nomes no stdin) | `supabase/functions/*/index.ts`: linhas, `Deno.env.get` lidos e quem invoca cada edge (`src/`, `supabase/migrations`, outras edges, `tests/e2e`, `cypress`, workflows)                         |
| `gerar-banco.mjs`    | `inventario/estado/banco.json`                                                  | banco oficial `fsisdfdwlbfeadwfqpir` via `banco.sql` (somente leitura) + `GET /functions` + `.from()` em `src/` e `supabase/functions/`                                                        |
| `mudou-conteudo.mjs` | nada (imprime `true`/`false`)                                                   | compara `inventario/estado/*.json` com o HEAD ignorando carimbo de data e telemetria rolante de 7 dias                                                                                         |

## Rodar

```sh
node scripts/inventario/gerar-rotas.mjs            # rotas.json
node scripts/inventario/gerar-rotas.mjs --check    # exit 1 se o commitado está velho
node scripts/inventario/gerar-repo.mjs < /dev/null # edges.json
node --test scripts/inventario/inventario.unit.mjs # testes das funções puras
```

Banco (precisa de credencial de leitura):

```sh
SUPABASE_ACCESS_TOKEN=... node scripts/inventario/gerar-banco.mjs
```

Sem token, numa sessão de agente: rode `scripts/inventario/banco.sql` no MCP do projeto oficial,
salve a resposta e passe o arquivo:

```sh
node scripts/inventario/gerar-banco.mjs --entrada /caminho/resposta.json
```

## Garantias

- **Nunca escreve no banco.** `banco.sql` é só `SELECT` em catálogo (`pg_class`, `pg_policies`,
  `cron.job`, `storage.buckets`) e roda em transação somente leitura na Management API.
- **Nunca vaza segredo.** De `cron.job` sai só o nome das funções chamadas (não o `command`, que pode
  ter URL/cabeçalho); de storage sai nome do bucket e contagem, nunca caminho de objeto. Antes de
  gravar, a saída é recusada se tiver cara de credencial (`Bearer`, JWT, `sb_secret_`).
- **Confere a origem.** A resposta só é aceita se ≥ 90% das tabelas de
  `src/integrations/supabase/types.ts` estiverem nela (e vice-versa) e se o ledger
  (`supabase_migrations.schema_migrations`) tiver as migrations recentes do repo — é o que impede
  gravar o inventário de um banco irmão/antigo como se fosse o oficial.
- **Saída determinística.** `rotas.json` não tem data nenhuma; `banco.json`/`edges.json` só têm o
  carimbo, que `mudou-conteudo.mjs` ignora ao decidir se abre PR.

## Quem roda sozinho

`.github/workflows/inventario-estado-semanal.yml` (segunda, 10:23 UTC) refaz tudo e abre PR em
`automation/inventario-estado` quando o conteúdo muda. O inventário do banco é **pulado com aviso**
enquanto o secret `SUPABASE_ACCESS_TOKEN` não existir no repositório — rotas e edges continuam sendo
atualizados.
