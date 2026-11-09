# Banco — VISÃO V2

Ler antes de qualquer SQL, migration, deploy de edge function ou diagnóstico de dados.
Regras curtas em `AGENTS.md` (seção **Banco**); aqui fica o detalhe.

## 1. Qual banco é o oficial

| Papel                                  | Project ref            | Observação                                                                                                                                                                                                                                                       |
| -------------------------------------- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Produção (oficial)**                 | `pmzxbffnbenkmzpnbehb` | Alvo único de DDL, seeds e deploy de edge functions. Migração concluída em 2026-07-31 (`docs/MIGRATION_PLAN.md:7`). Os seeds carregam o cabeçalho `-- Projeto: pmzxbffnbenkmzpnbehb` (`supabase/seed_gestao.sql:3`) e `scripts/seed-rules.mjs:6` aponta para lá. |
| **Lovable antigo — PROIBIDO escrever** | `fsisdfdwlbfeadwfqpir` | Projeto de origem. Continua cravado em `supabase/config.toml:1` e em `.env.production:4-6`.                                                                                                                                                                      |
| Externo, só leitura                    | `pgxfvjmuubtbowutlide` | CRM de outro produto (MCP `SUPABASE - GESTÃO DE CLIENTES`). Nunca alvo de DDL do VISÃO.                                                                                                                                                                          |
| Externo, só leitura                    | `doufsxqlfjyuvxuezpln` | Catálogo de outro produto (MCP `SUPABASE - GESTÃO DE PRODUTOS`). Nunca alvo de DDL do VISÃO.                                                                                                                                                                     |

`qnjozykmaeifjqpicaue` aparece só em fixture de teste de edge function
(`supabase/functions/health/index.test.ts`) — não é banco real, não use.

### O bug que isso causa hoje (não conserte de passagem — é tarefa própria)

`supabase/config.toml:1` e `.env.production` ainda apontam para o projeto antigo. Consequência medida
na auditoria: as 14 rotinas agendadas que chamam edge functions resolvem para um host que não existe
mais — 1.536 de 1.536 chamadas HTTP da janela retida falharam com `Couldn't resolve host name`, taxa de
sucesso 0,00%, e o `pg_cron` registra isso como **sucesso** porque `net.http_post()` mede o
enfileiramento, não a entrega (`ESTADO_ATUAL.md:17-18`, `docs/estado/04-DADOS.md:246-249`).
`docs/MIGRATION_PLAN.md:16` afirma que a Fase 0 já corrigiu o `config.toml` — **é falso**, conferido em
`docs/estado/04-DADOS.md:327`. Se for corrigir, é PR própria (`fix(db):`), com o dono avisado: mexer no
`project_id` muda o alvo de `supabase db push`/`functions deploy`.

## 2. MCP de banco nesta sessão

Não existe MCP apontado para `pmzxbffnbenkmzpnbehb`. Os dois MCPs Supabase carregados são de **outros
produtos** (CRM e Catálogo) — confira antes de usar qualquer um (`get_project_url`), porque os nomes são
parecidos e um `execute_sql` no MCP errado escreve no banco de outro produto.

Sem MCP do VISÃO:

- Leitura/diagnóstico: Supabase CLI com `--project-ref pmzxbffnbenkmzpnbehb` (token do dono) ou o painel.
- **Nunca** declare SQL "aplicado" sem saída de comando. Sem acesso → reporte e pare (`AGENTS.md` → Postura).

## 3. Fluxo de DDL (obrigatório)

1. Arquivo novo em `supabase/migrations/<AAAAMMDDHHMMSS>_<slug>.sql` — nunca editar migration já aplicada.
2. `npm run check:migrations` (`scripts/lint-migrations.mjs`) verde.
3. PR → merge em `main` → só então aplicar no projeto oficial. **Nunca aplicar de branch aberta**: o banco
   passaria a ter schema que a `main` não tem.
4. Depois de aplicar: confirmar com query real (contagem, `\d` da tabela, policy listada) e anexar na PR.
5. Destrutivo (`DROP`, `TRUNCATE`, `DELETE` sem filtro, remoção de coluna com dado) → **só com o dono**.

### Regras que o lint cobra (`scripts/lint-migrations.mjs:5-17`)

| Regra | O que exige                                                         |
| ----- | ------------------------------------------------------------------- |
| R1    | Tabela `public.X` com RLS habilitado em algum ponto da história     |
| R2    | `GRANT` para `authenticated` ou `service_role`                      |
| R3    | Função `SECURITY DEFINER` com `SET search_path` no bloco de criação |
| R5    | `GRANT ... TO PUBLIC` pede justificativa                            |
| R6    | Migration dentro de `BEGIN;`/`COMMIT;`                              |
| R7    | Bloco `-- ROLLBACK:` documentando como reverter                     |

Baselines: R1-R5 valem para arquivos `>= 20260716`; R6/R7 para `>= 20260905` — migration antiga não é
reescrita (`scripts/lint-migrations.mjs:26,37`). Supressão pontual: `-- lint-ignore: R<n> motivo`.

## 4. Checagens de banco já prontas

`package.json` tem **74 scripts `db:check:*`** e **101 `simulate:*`/`sim:*`**. Antes de escrever
verificação nova, procure a que já existe:

```sh
node -e 'const s=require("./package.json").scripts;console.log(Object.keys(s).filter(k=>k.startsWith("db:check")).join("\n"))'
npm run db:check:all        # roda a bateria (definer, rls, dba, partitions, drain, quarantine, ...)
npm run db:check:rls        # scripts/check-rls-exposure.mjs
npm run db:check:definer    # SECURITY DEFINER sem search_path
```

Eles falam com banco real: exigem credencial no ambiente e contam como leitura de produção.

## 5. Ambientes

- **Produção**: só leitura para diagnóstico. DDL apenas pelo fluxo acima.
- **Teste**: Postgres descartável (container). Nunca "testar" direto em produção.
- **Dev local**: `.env.local`/`.env.development`; sem as variáveis locais o front aponta para o Supabase
  de produção — assuma produção até provar o contrário (`.env.example`, `.env.local.example`).
- **Edge functions**: 74 em `supabase/functions/` + `_shared`. 9 delas retornam 500 em runtime enquanto os
  19 secrets não forem setados (`docs/MIGRATION_PLAN.md:18`). Secret só via `supabase secrets set` ou painel,
  nunca em código.
- Tabelas: 169 com RLS em 100% delas na medição de 2026-08-16 (`ESTADO_ATUAL.md:10`). Toda tabela nova
  nasce com RLS e policy por tenant — ver `regras-dominio.md`.
