# VALIDAÇÃO DA AUDITORIA — testando o próprio trabalho

**Data:** 2026-08-16 · **Executado por:** o mesmo auditor, contra os próprios resultados
**Regra aplicada:** nenhum achado da auditoria vale por ter sido escrito. Cada número aqui foi
recalculado do zero, por caminho independente do que o produziu.

---

## Placar

| Resultado                                         | Quantidade |
| ------------------------------------------------- | ---------- |
| Verificações que **passaram**                     | 9          |
| **Erros encontrados** no meu trabalho             | 3          |
| **Gaps** (escopo que eu disse cobrir e não cobri) | 2          |
| Achados **novos** surgidos da validação           | 1          |

---

## TESTE 0 — Evidência fabricada (o teste mais barato)

Extraí **todas** as citações `arquivo:linha` dos 9 documentos e testei, uma a uma, se o arquivo
existe e se a linha citada cabe dentro dele.

| Medida                          | Valor   |
| ------------------------------- | ------- |
| Citações únicas extraídas       | **466** |
| Arquivo existe e linha é válida | **459** |
| Linha além do fim do arquivo    | **0**   |
| Arquivo inexistente             | 7       |

Os 7 "inexistentes" foram inspecionados um a um:

- **5 são o próprio achado** — o documento diz explicitamente _"não existe"_ / _"arquivo ausente"_:
  `src/lib/featureFlags.ts` (teste-espelho testando classe que não existe),
  `src/lib/index.ts`, `src/lib/insightface/cache.ts`,
  `scripts/build-mobile-nav-diff-report.mjs`, `tests/e2e/.auth/user.json`.
- **2 são falso-positivo do meu extrator**: `src/types/supabase.ts` e `supabase/types.ts` são
  fragmentos do caminho real `src/integrations/supabase/types.ts`, que **existe** (324 KB).

**Veredito: zero evidência fabricada em 466 citações.**

---

## TESTE 1 — A tese central do veredito ✅ PASSOU

Se este achado cair, o documento executivo inteiro cai. Recalculei direto de `net._http_response`:

| Medida                             | Valor                              |
| ---------------------------------- | ---------------------------------- |
| Chamadas HTTP registradas          | **1.536**                          |
| Com `error_msg` preenchido         | **1.536 (100%)**                   |
| Com `status_code` HTTP             | **0**                              |
| Mensagem de erro (única, agrupada) | `Couldn't resolve host name`       |
| Janela retida                      | 2026-08-16 11:22 → 17:21 UTC (~6h) |

E a causa, recalculada de `cron.job.command`:

| Medida                              | Valor                                      |
| ----------------------------------- | ------------------------------------------ |
| Jobs que fazem chamada HTTP         | **14**                                     |
| Hosts de destino distintos          | **1**                                      |
| Host                                | `https://fsisdfdwlbfeadwfqpir.supabase.co` |
| Jobs apontando para o projeto atual | **0**                                      |

Confirmado no repositório: `supabase/config.toml:1` = `project_id = "fsisdfdwlbfeadwfqpir"` e
`.env.production` com o mesmo host. **Tese confirmada integralmente.**

---

## TESTE 2 — Lista de código morto ✅ PASSOU (e meu primeiro teste estava errado)

O risco aqui é o oposto do usual: um critério frouxo classifica **código vivo como órfão**, e
alguém apaga. Testei por amostragem `src/layouts/` e `src/stores/`, declarados 100% mortos.

**Minha primeira tentativa produziu falso-positivo.** Usei `grep "from '.*MainLayout'"` e obtive
_70 importadores_ para `src/layouts/MainLayout.tsx` — o que teria derrubado o achado. Estava
errado: o padrão casava `@/components/layout/MainLayout`, **outro arquivo**.

Refeito com casamento de caminho exato:

| Alvo                      | Importadores fora do próprio diretório |
| ------------------------- | -------------------------------------- |
| `@/layouts` (e relativos) | **0**                                  |
| `@/stores` (e relativos)  | **0**                                  |
| `@/components/layout`     | **67**                                 |

**Achado confirmado**, e o refactor abandonado fica provado: existem dois `MainLayout`; o que roda
é `src/components/layout/MainLayout.tsx` (`App.tsx:17`), e `src/layouts/` inteiro é órfão.

> Registro do meu próprio erro de método, porque ele é a lição: **grep por sufixo de nome não
> prova consumo.** Só caminho de import prova. Foi exatamente a armadilha que eu estava caçando.

---

## TESTE 3 — Demais verificações que passaram

| #   | Alegação                                                                | Recálculo independente                                                                                       | Status |
| --- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ------ |
| 3   | `package.json:352` declara `@swc/core-win32-x64-msvc` em `dependencies` | Linha confere; blocos em `:317` (dependencies) e `:410` (devDependencies); **não há `optionalDependencies`** | ✅     |
| 4   | 9 workflows-fantasma de corpo idêntico                                  | Os 9 têm **exatamente 25 linhas** e 2 `\|\| true` cada                                                       | ✅     |
| 5   | 74 Edge Functions                                                       | 75 diretórios − `_shared` = **74**                                                                           | ✅     |
| 6   | Storage: 0 objetos em 10 buckets                                        | 10 buckets, **0 objetos em todos**, todos privados                                                           | ✅     |
| 7   | `maintenance_dispatch_runs` 100% `muted`                                | 52 runs, 52 `muted`, `sum(sent) = 0`                                                                         | ✅     |
| 8   | Nenhuma tabela particionada                                             | `relkind='r'` nas pais **e** nas supostas partições                                                          | ✅     |
| 9   | Dado fabricado não contaminou o banco                                   | 0 linhas com `camera_name='Upload Manual'`, 0 com `confidence=0.92`                                          | ✅     |

---

## ❌ ERRO 1 — O número "739 alertas críticos abertos" não tem lastro

**Onde aparece:** `ESTADO_ATUAL.md:132` e `ESTADO_ATUAL.md:209`.

**Onde NÃO aparece:** em nenhum documento de detalhe. É um número que surgiu na consolidação e
não é sustentado por dimensão nenhuma — violação da minha própria regra de evidência.

**O que o banco diz, recalculado:**

| `severity` | Total  | Não lidos (`is_read=false`) |
| ---------- | ------ | --------------------------- |
| `high`     | 26.821 | **26.821 (100%)**           |
| `medium`   | 25     | 21                          |
| `critical` | **19** | **15**                      |
| `low`      | 14     | 14                          |

Além disso, `public.alerts` **não possui coluna `status`** — a expressão "alertas abertos" nem é
representável nesse schema. O campo é `is_read` (booleano).

**Correção:** não existem 739 alertas críticos abertos. Existem **19 alertas `critical`** (15 não
lidos) e **26.821 alertas `high`, dos quais 100% nunca foram lidos**.

**O achado real é mais forte do que o número errado sugeria:** de 26.879 alertas gerados,
**26.871 (99,97%) nunca foram lidos por ninguém**. Não é uma fila de trabalho acumulada — é um
canal de saída que nunca teve leitor.

---

## ❌ ERRO 2 — "21 cron jobs ausentes do repositório" está inflado

**Onde aparece:** `ESTADO_ATUAL.md:64` — _"Cron jobs ativos ausentes do repositório: 21 de 69 (30%)"_.

**Recálculo:** extraí os 69 `jobname` de `cron.job` e busquei cada um, como literal, em
`supabase/`, `scripts/` e `.github/`.

| Medida                             | Valor              |
| ---------------------------------- | ------------------ |
| Presentes em algum arquivo do repo | **51**             |
| **Ausentes**                       | **18 de 69 (26%)** |

**Correção: 18, não 21.** A direção do achado se mantém — mais de um quarto dos jobs ativos em
produção não existe em arquivo nenhum, incluindo `visao-db-health-snapshot`,
`daily-retention-cleanup`, `stream_health_probe_every_2m`, `cron-watchdog-30m` e
`monitoring-center-dispatch-every-minute`. Mas o número publicado estava alto em 3.

_Nota de método:_ minha busca cobre três diretórios; uma busca restrita só a `supabase/migrations/`
daria número maior. Publico **18** por ser a medida mais conservadora e reprodutível.

---

## ❌ ERRO 3 — O risco "CI que mente" foi SUBESTIMADO, não exagerado

**Onde aparece:** `ESTADO_ATUAL.md:95` — _"9 workflows não conseguem falhar"_.

Os 9 estão corretos. Mas contei quantos workflows contêm `|| true` em qualquer lugar:

| Medida                           | Valor        |
| -------------------------------- | ------------ |
| Workflows com `\|\| true`        | **23 de 42** |
| Avaliados no documento executivo | 9            |
| **Não avaliados**                | **14**       |

Inspecionei os 14. A maioria é uso legítimo (`ls ... || true` em `coverage.yml:55`,
merge de relatório em `e2e-playwright.yml:147`). **Mas dois são gates de segurança que não podem
falhar por construção:**

| Arquivo                                  | Linha | Comando                                                           |
| ---------------------------------------- | ----- | ----------------------------------------------------------------- |
| `.github/workflows/security-scan.yml`    | `:26` | `npm install --ignore-scripts \|\| npm install --force \|\| true` |
| `.github/workflows/security-scan.yml`    | `:29` | `npm audit --audit-level=none \|\| true`                          |
| `.github/workflows/dependency-audit.yml` | `:24` | `npm install --ignore-scripts \|\| npm install --force \|\| true` |
| `.github/workflows/dependency-audit.yml` | `:27` | `npm audit --audit-level=none \|\| true`                          |

`--audit-level=none` já significa "não falhe por vulnerabilidade nenhuma"; o `|| true` a seguir é
redundância sobre uma garantia que já existia. E o `|| true` no `npm install` faz o job seguir
adiante mesmo sem dependências instaladas — então o `npm audit` roda sobre árvore possivelmente
vazia.

**Correção:** são **11 workflows de falso-verde relevantes, não 9** — e os 2 adicionais são
justamente os de **segurança**, o que agrava o risco em vez de atenuá-lo.

---

## ⚠️ GAP 1 — A "contagem honesta" cobre 3 das 8 dimensões

`ESTADO_ATUAL.md:37-42` apresenta um consolidado de **196 itens** como se fosse o total do sistema.
Ele soma apenas **Funcionalidades de tela (72) + Edge Functions (74) + Integrações (50)**.

**Ficaram fora da contagem, embora tenham classificações próprias:**

| Documento        | Itens classificados (aprox., por marcação) |
| ---------------- | ------------------------------------------ |
| `02-LOGICA.md`   | ~81                                        |
| `05-INFRA-CI.md` | ~110                                       |
| `07-TESTES.md`   | ~52                                        |
| `04-DADOS.md`    | ~39                                        |

O percentual "45 ✅ (23%)" é, portanto, **percentual de um subconjunto**, não do sistema. O
documento não declarava essa limitação. Está declarada agora.

---

## ⚠️ GAP 2 — Contagens do executivo não reconciliam com os documentos de detalhe

| Dimensão       | ✅ no executivo | ✅ marcados no documento |
| -------------- | --------------- | ------------------------ |
| Frontend       | 28              | 32                       |
| Edge Functions | 17              | 26                       |
| Integrações    | 0               | 2                        |

As diferenças têm explicação plausível (marcações aparecem também em prosa, fora das tabelas; e o
consolidador aplicou a regra de ouro rebaixando itens apoiados em seed). **Mas eu não reconciliei
item a item, e o executivo não explica a diferença.** Quem confrontar os dois documentos encontra
números distintos sem nota de conciliação. Registrado como dívida, não corrigido.

---

## 🆕 ACHADO NOVO — Um VMS que nunca armazenou uma única mídia

Surgiu ao validar o item de Storage, e merecia destaque no executivo:

| Bucket                                                                                                                                                                      | Objetos        |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| `avatars`, `camera-clips`, `camera-continuous`, `camera-snapshots`, `camera-thumbnails`, `heatmap-snapshots`, `nvr-recordings`, `person-photos`, `recordings`, `site-plans` | **0 em todos** |

**10 de 10 buckets vazios.** Nenhum clipe, nenhum snapshot, nenhuma gravação de NVR, nenhuma foto
de pessoa. Para um sistema de videomonitoramento, isto é evidência independente — e talvez a mais
direta de todas — de que **o produto nunca operou com mídia real em produção**. Não depende de
inferência sobre seeds nem sobre cron: ou há vídeo armazenado, ou não há.

---

## GAP 1 e 2 — FECHADOS: reconciliação e contagem sobre todas as dimensões

### Por que 3 dimensões ficam fora da soma (e não é omissão)

Ao reconciliar, descobri a razão real da exclusão — que o executivo não declarava:

| Documento       | Fica fora porque                                                                                                                                                                                                                                                         |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `04-DADOS.md`   | **Usa outra taxonomia.** Declara em `:8`: _"✅ medido e íntegro · 🟨 medido, com risco · ⬛ medido, quebrado · 🟦 sem evidência"_. Isso mede **integridade da medição**, não **grau de implementação**. Somar seus símbolos aos demais seria somar grandezas diferentes. |
| `02-LOGICA.md`  | **Unidade incompatível.** Classifica por arquivo/módulo (432 arquivos no escopo), não por funcionalidade. Um hook órfão e uma tela inteira não são o mesmo "item".                                                                                                       |
| `08-RUNTIME.md` | São **achados** (R1–R6), não inventário.                                                                                                                                                                                                                                 |

_Nota:_ `04-DADOS.md` redefinir a legenda é, em si, uma inconsistência de método da auditoria —
as instruções de fatiamento fixavam uma taxonomia única. Registrado, não corrigido (reclassificar
o documento inteiro exigiria re-auditar a dimensão).

### Contagem consolidada — 5 dimensões de taxonomia comparável

| Dimensão                |        ✅ |        🟨 |        🟦 |        ⬛ |    Base | Fonte                      |
| ----------------------- | --------: | --------: | --------: | --------: | ------: | -------------------------- |
| Funcionalidades de tela |        28 |        37 |         7 |         0 |      72 | `01-FRONTEND.md:193-196`   |
| Edge Functions          |        17 |        47 |         3 |         7 |      74 | `03-BACKEND-EDGE.md:24-27` |
| Workflows de CI         |         6 |        12 |         0 |        24 |      42 | `05-INFRA-CI.md:21-24`     |
| Integrações externas    |         0 |        10 |        30 |        10 |      50 | `06-INTEGRACOES.md:245`    |
| Suítes de teste         |         3 |         6 |         2 |        14 |      25 | `07-TESTES.md:587+`        |
| **TOTAL**               |    **54** |   **112** |    **42** |    **55** | **263** |                            |
| **%**                   | **20,5%** | **42,6%** | **16,0%** | **20,9%** |    100% |                            |

_Conferência: 72+74+42+50+25 = 263, e 54+112+42+55 = 263._

**O número honesto é pior que o publicado.** O executivo dizia _45 ✅ de 196 (23%)_; sobre a base
completa das dimensões comparáveis é **54 de 263 (20,5%)**.

### Aplicando a regra de ouro com número, não com ressalva

O executivo dizia que os ✅ eram "teto, não medida", sem quantificar. Agora quantifico.

Cruzei, programaticamente, as **61 tabelas com dados** contra todas as tabelas alcançadas por
`INSERT` nos arquivos `supabase/seed*.sql`:

| Grupo                       |    Qtd | Composição                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| --------------------------- | -----: | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Alcançadas por seed**     | **25** | `alerts`, `cameras`, `plate_detections`, `recognition_logs`, `registered_persons`, `registered_plates`, `zones`, `zone_events`, `rules`, `ppe_configs`, `ppe_violations`, `ppe_zones`, `site_plans`, `site_plan_placements`, `organizations`, `organization_members`, `user_roles`, `collab_invitations`, `collab_memberships`, `collab_networks`, `evidence_exports`, `panic_events`, `event_alerts`, `analysis_history`, `behavior_analyses` |
| **Não alcançadas por seed** | **36** | `edge_function_error_audit`, `db_health_snapshots`, `cron_watchdog_runs`, `cron_watchdog_escalations`, `agent_healing_runs`, `maintenance_alert_*`, `partition_*_runs`, `*_purge_runs`, `camera_clock_skew_*`, `camera_vault_audit`, `query_telemetry`, `audit_logs`, `stream_restart_events`, `root_cause_correlation_runs`, `camera_health_state`, `profiles`, `notification_configs`, …                                                     |

**O corte é limpo e não é coincidência:** as 25 alcançadas por seed são **exatamente** as tabelas
de funcionalidade de negócio. As 36 restantes são **exatamente** telemetria de infraestrutura —
com as únicas exceções sendo `profiles` (**1** linha, um usuário) e um punhado de configuração
(`notification_configs` = 2, `collab_network_secrets` = 2).

> **Conclusão quantificada:** **nenhuma tabela de funcionalidade de negócio deste sistema contém
> dados que não sejam explicáveis por seed.** O que tem tráfego orgânico é a camada que observa a
> si mesma.

_(Correção de precisão: eu vinha publicando "26 das 61". A medição programática dá **25**.)_

### O intervalo honesto de "pronto"

Os 28 ✅ de tela foram atribuídos por "UI → lógica → persistência **com linhas reais no banco**".
Se essas linhas são de seed, o critério não se cumpre e eles caem para 🟨.

| Cenário                                                                     |  ✅ |  % de 263 |
| --------------------------------------------------------------------------- | --: | --------: |
| **Teto** — contagem nominal, sem regra de ouro                              |  54 | **20,5%** |
| **Piso** — todos os 28 ✅ de tela rebaixados por dependerem de dado de seed |  26 |  **9,9%** |

Não afirmo o piso como medida: parte dos 28 pode se apoiar em telas de infraestrutura (saúde do
banco, watchdog), cujas tabelas **não** são de seed. Distinguir um a um exigiria re-auditar a
dimensão de frontend. **O valor verdadeiro está entre 10% e 20,5%**, e o executivo deve ser lido
com esse intervalo, não com um número único.

---

## O que esta validação NÃO cobriu

1. ~~Não reconciliei item a item as contagens do executivo com as dos detalhes (GAP 2).~~
   **FECHADO** na seção acima. Resta a dívida de `02-LOGICA.md` e `04-DADOS.md` permanecerem fora
   da contagem por incompatibilidade de unidade e de taxonomia — declarado, não resolvido.
2. **Não revalidei** os números de cobertura de teste (`160 de 1.185`) nem o total de arquivos
   inalcançáveis (`373 de 1.186`) — testei a lista de código morto por **amostragem**
   (`layouts`, `stores`), não integralmente.
3. **Continua valendo:** nenhum teste, lint ou build foi executado; `node_modules` segue ausente.
4. **Continua valendo:** sem token de gestão Supabase, logs de Edge Functions permanecem
   `NAO_VERIFICADO`.
5. A janela de `net._http_response` continua sendo de ~6h — é o que o `pg_net` retém.

---

## Conclusão da validação

A auditoria **sobrevive ao próprio escrutínio nos pontos que sustentam o veredito**: a ponte
cron→Edge Functions quebrada, o ambiente não reconstruível, o particionamento inexistente, o dado
fabricado, o storage vazio e a lista de código morto foram todos reconfirmados por caminho
independente, e nenhuma das 466 citações é fabricada.

Os três erros encontrados são de **números secundários** — e, notavelmente, **dois deles subestimam
o problema** (o falso-verde de CI é maior que o publicado; o volume de alertas ignorados é 36×
maior que o número errado sugeria). Apenas um erro (`21 → 18` cron jobs) exagerava.

Isso não torna o documento confiável por decreto. Torna-o **verificável** — que é a única forma
honesta de confiança em auditoria.
