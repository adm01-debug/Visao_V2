# ESTADO ATUAL DO SISTEMA — Auditoria

**Data:** 2026-08-16 · **Branch:** `claude/system-status-roadmap-kwz0u0` · **Método:** análise estática do repositório + leitura do banco de produção
**Produção foi apenas lida.** Zero DDL, zero DML, zero deploy, zero alteração.

---

## Veredito em uma tela

O sistema tem **~285.000 linhas** de código muito bem organizado, 169 tabelas com RLS em 100% delas
e uma infraestrutura de automonitoramento que funciona de verdade. Não é um projeto abandonado nem
mal escrito.

Mas há um cabo desligado entre a nuvem e o produto, e ele explica quase tudo o que está vazio:

> **As 14 rotinas agendadas que chamam Edge Functions apontam para um host que não existe mais.
> Das 1.536 chamadas HTTP registradas na janela retida, 1.536 falharam com
> `Couldn't resolve host name`. Nenhuma obteve resposta HTTP. Taxa de sucesso: 0,00%.**

E o `pg_cron` reporta essas execuções como **bem-sucedidas** — porque `net.http_post()` mede o
enfileiramento, não a entrega. É por isso que o painel diz 0,13% de falha enquanto nada chega ao
destino.

O destino é `https://fsisdfdwlbfeadwfqpir.supabase.co` — o **projeto Lovable antigo**, o mesmo ref
que ainda está em `supabase/config.toml:1` e em `.env.production`. O sistema migrou de banco em
2026-07-31; a fiação de saída não migrou junto.

**A consequência prática:** o que se automonitora está vivo; o produto de videomonitoramento
**não tem uso real comprovável** nos dados de produção.

---

## Contagem honesta

### Por dimensão, com denominador

| Dimensão                | ✅ Total     | 🟨 Parcial   | 🟦 Só iniciado | ⬛ Morto    | Base               |
| ----------------------- | ------------ | ------------ | -------------- | ----------- | ------------------ |
| Funcionalidades de tela | 28           | 37           | 7              | —           | 72 funcionalidades |
| Edge Functions          | 17           | 47           | 3              | 7           | 74 funções         |
| Integrações externas    | **0**        | 10           | 30             | 10          | 50 integrações     |
| **Consolidado**         | **45 (23%)** | **94 (48%)** | **40 (20%)**   | **17 (9%)** | **196 itens**      |

> **⚠️ QUADRO ACIMA SUPERADO — use a contagem reconciliada abaixo.** O consolidado de 196 itens
> cobria apenas 3 dimensões. A reconciliação está em `09-VALIDACAO.md`.

### Contagem reconciliada — 5 dimensões de taxonomia comparável

| Dimensão                |        ✅ |        🟨 |        🟦 |        ⬛ |    Base |
| ----------------------- | --------: | --------: | --------: | --------: | ------: |
| Funcionalidades de tela |        28 |        37 |         7 |         0 |      72 |
| Edge Functions          |        17 |        47 |         3 |         7 |      74 |
| Workflows de CI         |         6 |        12 |         0 |        24 |      42 |
| Integrações externas    |         0 |        10 |        30 |        10 |      50 |
| Suítes de teste         |         3 |         6 |         2 |        14 |      25 |
| **TOTAL**               |    **54** |   **112** |    **42** |    **55** | **263** |
| **%**                   | **20,5%** | **42,6%** | **16,0%** | **20,9%** |    100% |

**O número honesto é pior que o publicado antes:** 20,5% ✅, não 23%.

> **Atualização de 2026-11-28 — o denominador mudou.** Duas linhas da tabela acima envelheceram:
> `Workflows de CI` era 42 e hoje são **45** (o `e2e.yml` foi removido e o E2E virou um só), e o
> `01-FRONTEND.md` passou a marcar **29** telas ✅, não 28. Recontado sobre o código de `main`
> `fe1d82c`, com o mesmo critério da auditoria: **55 de 266 (20,7%)**. A diferença é ruído de
> medição, não avanço de implementação — não leia como progresso.

Três dimensões continuam fora da soma, **por incompatibilidade declarada, não por omissão**:
`04-DADOS.md` redefiniu a legenda (mede integridade da medição, não grau de implementação);
`02-LOGICA.md` classifica por arquivo, não por funcionalidade; `08-RUNTIME.md` traz achados, não
inventário.

### A regra de ouro, agora com número

Cruzei as 61 tabelas com dados contra todos os `INSERT` dos `seed*.sql`:

| Grupo                   |    Qtd | O que são                                                                                                       |
| ----------------------- | -----: | --------------------------------------------------------------------------------------------------------------- |
| Alcançadas por seed     | **25** | **exatamente** as tabelas de funcionalidade de negócio — ALPR, facial, EPI, zonas, regras, câmeras, colaboração |
| Não alcançadas por seed | **36** | **exatamente** telemetria de infraestrutura — watchdogs, purges, health snapshots, auditoria de erro            |

As únicas exceções entre as 36 são `profiles` (**1** linha) e configuração residual.

> **Nenhuma tabela de funcionalidade de negócio contém dado que não seja explicável por seed.**

Logo, o "pronto" real está num intervalo, não num ponto:

| Cenário                                                        |  ✅ |  % de 263 |
| -------------------------------------------------------------- | --: | --------: |
| **Teto** — contagem nominal                                    |  54 | **20,5%** |
| **Piso** — os 28 ✅ de tela rebaixados por se apoiarem em seed |  26 |  **9,9%** |

**Leia o sistema como estando entre 10% e 20,5% de pronto**, não como 23%.

### Ajuste que o consolidador aplica sobre os relatórios

A regra de ouro é _pronto = em produção com uso real_. Verifiquei a origem dos dados e
**25 das 61 tabelas com linhas são populadas por arquivos de seed** (`seed_intelligence.sql`,
`seed_gestao.sql`, `seed_ppe.sql`, `seed_behavior.sql`) — incluindo ALPR, reconhecimento facial,
EPI, zonas, regras e câmeras.

Logo, **boa parte dos 28 ✅ de tela se apoia em dado de demonstração, não em adoção.** Não os
reclassifiquei um a um (exigiria rastrear a origem linha a linha, fora do alcance desta rodada),
mas o número real de ✅ é **menor que 45**, e o leitor deve tratá-lo como teto, não como medida.

### Outros denominadores medidos

| Medida                                                 | Valor                                                     |
| ------------------------------------------------------ | --------------------------------------------------------- |
| Tabelas sem nenhum registro                            | **108 de 169 (64%)**                                      |
| Arquivos de `src/` inalcançáveis a partir de `App.tsx` | **373 de 1.186 (31,5%)**                                  |
| Cobertura de teste sobre módulos de produção           | **160 de 1.185 (13,5%)**                                  |
| Baseline de cobertura declarada pelo próprio repo      | 7,92% (`coverage-baseline.json:6`)                        |
| Migrations versionadas × registradas como aplicadas    | **361 × 3**                                               |
| Cron jobs ativos ausentes do repositório               | **18 de 69 (26%)** ⟵ _corrigido; publicado antes como 21_ |
| Buckets de Storage com objetos                         | **0 de 10** — _nenhuma mídia jamais armazenada_           |

---

## Riscos estruturais, por gravidade

### 1. A ponte cron → Edge Functions está 100% quebrada ⬛

`net._http_response`: 1.536 de 1.536 chamadas com `Couldn't resolve host name`, `status_code` nulo
em todas. Os 14 jobs apontam para o ref do projeto antigo. Derruba de uma vez: monitor de saúde de
câmera, sondagem de stream, revalidação RTSP, tiering de storage, ONVIF puller, central de
monitoramento, watchdogs de vault e de SLA. Explica mecanicamente a maior parte das 108 tabelas
vazias.
_Verificado por mim, e independentemente por duas dimensões (backend e integrações)._

### 2. Nenhum gate de CI protege coisa alguma 🟨

Duas falhas somadas:

- **`npm ci` não instala.** **`package.json:352` declara `"@swc/core-win32-x64-msvc": "1.15.47"`
  dentro de `dependencies`** — o único binário de plataforma no bloco, e o `package.json` sequer
  tem `optionalDependencies` (blocos: `dependencies` na 317, `devDependencies` na 410). Alguém
  promoveu manualmente um binário exclusivo de Windows a dependência de runtime. `npm ci` aborta
  com `EBADPLATFORM` em runner Linux, e todo job morre antes de verificar qualquer coisa.
  A entrada obrigatória em `package-lock.json:6861` é **consequência**, não causa — a contraprova
  está em `package-lock.json:6656-6668`, onde `@swc/core` declara corretamente seus 12 binários em
  `optionalDependencies`. Confirmado empiricamente no PR #88: 12 checks vermelhos num diff de dois
  arquivos `.md`.

  > **Correção de diagnóstico:** na primeira leitura eu atribuí a causa ao lockfile e sugeri
  > restaurar `"optional": true` na linha 6861. **Estava errado** — essa correção seria desfeita no
  > próximo `npm install`, porque o `package.json` continuaria declarando a dependência. A causa é
  > a declaração em `package.json:352`. Registrado também no PR #88.

- **9 workflows não conseguem falhar.** `chromatic`, `visual-regression`, `accessibility`,
  `performance`, `lighthouse`, `bundle-size`, `size`, `feature-flags`, `e2e-coverage` têm corpo
  idêntico: `npm run build || true` seguido de `echo '✅ … completed'`. Reportam verde sempre.
  _Li os nove arquivos._ **Confirmado na validação:** os 9 têm exatamente 25 linhas cada.

  > **CORREÇÃO (validação) — eu SUBESTIMEI este risco.** São **23 dos 42 workflows** que contêm
  > `|| true`; avaliei apenas 9. Dos 14 restantes, a maioria é uso legítimo, **mas dois são gates
  > de segurança que não podem falhar por construção**:
  > `security-scan.yml:26,29` e `dependency-audit.yml:24,27`, ambos com
  > `npm install … || npm install --force || true` seguido de `npm audit --audit-level=none || true`.
  > `--audit-level=none` já garante que nada reprova; o `|| true` é redundância sobre isso. E o
  > `|| true` no install faz o audit rodar sobre árvore possivelmente vazia.
  > **São 11 workflows de falso-verde relevantes, não 9 — e os 2 adicionais são os de segurança.**

### 3. O ambiente não é reconstruível a partir do repositório ⬛

361 migrations versionadas, 3 registradas. Um único commit (`e9bc5c4`) trouxe todas de uma vez —
é um despejo, não um histórico. `profiles`, `query_telemetry` e `behavior_analyses` existem em
produção **com dados** e nunca recebem `CREATE TABLE` em migration alguma, embora 19 comandos
`ALTER`/`CREATE INDEX`/`CREATE POLICY` operem sobre elas. `supabase db push` num banco limpo
abortaria.

### 4. Particionamento declarado que não existe 🟦

**Nenhuma tabela deste banco é particionada** (`relkind='r'` em todas, inclusive nas 22 supostas
partições, todas órfãs e vazias, carregando 110 índices e 22 policies inúteis). Agravante: a
migration de rebuild `20260513180019_….sql:2-3` abre com `DROP TABLE … CASCADE` comentado como
_"tabelas antigas (vazias)"_ — hoje isso destruiria 350 linhas reais, e o arquivo não tem `BEGIN;`.

### 5. Dado fabricado gravado no banco por caminho de produção 🟨

- `src/components/LicensePlateRecognition.tsx:68-78` — no `catch`, gera placa aleatória, persiste
  com `confidence: 0.92` e exibe _"Placa detectada"_ ao operador, sem marcar que é simulação.
- `src/components/behavior/useBehaviorAnalysis.ts:126-128` — `generateMockBehavior()` no `catch`,
  persistido.
- `src/hooks/useCameras.ts:123` — `seedCameras()` insere câmeras fictícias quando o usuário não
  enxerga nenhuma câmera.

**Risco armado, incidente não consumado:** verifiquei que os dados atuais **não** vieram desses
caminhos (zero linhas com `camera_name='Upload Manual'`, zero com `confidence=0.92`). Basta a Edge
Function falhar para o operador ver ficção como detecção real.

### 6. Rotina de alertas de manutenção quebrada há 14 dias 🟨

`evaluate_maintenance_alerts()` falha em **100% das execuções** desde 2026-08-02 (338 falhas /
45 sucessos) — `column reference "severity" is ambiguous`, linha 226. A rotina que avisa é a que
está quebrada, então o silêncio parece normalidade. **Correção de uma linha.**

### 7. Notificação nunca sai 🟨

`cron_watchdog_escalations`: 7.184 linhas, **100% com `delivery_error='telegram_not_configured'`**.
`maintenance_dispatch_runs`: 52 linhas, **100% `outcome='muted'`, `sent=0`** — com ~~739 alertas
críticos abertos~~. O sistema detecta e registra; ninguém é avisado.

> **CORREÇÃO (validação):** o número **739 estava errado e sem lastro** — não aparecia em nenhum
> documento de detalhe. A tabela `public.alerts` sequer tem coluna `status`; o campo é `is_read`.
> Recalculado: **19 alertas `critical`** (15 não lidos) e **26.821 `high`, 100% não lidos**.
> De 26.879 alertas gerados, **26.871 (99,97%) nunca foram lidos**. O achado real é mais grave que
> o número errado sugeria: não é fila acumulada, é canal sem leitor. Ver `09-VALIDACAO.md`.

### 8. Seis funções sem autenticação com privilégio total 🟨

`glacier-stuck-monitor`, `maintenance-alerts-dispatch`, `preview-telemetry-alert`,
`stream-health-probe`, `vault-coverage-watchdog`, `watchdog-ack-sla-alert`: `verify_jwt = false`,
zero verificação interna, usando `service_role`. O mecanismo que resolveria isso existe —
`_shared/webhookHmac.ts` — e tem **zero consumidores**.

### 9. Documentação que afirma o oposto do medido 🟦

- `src/integrations/README.md` promete **24 integrações**; `index.ts` tem **5 linhas**, só Supabase.
- `FUNCIONALIDADES_COMPLETAS.md` conclui _"~95-100% do escopo viável implementado"_ e lista 15
  tabelas — o banco tem 169.
- `src/services/README.md` descreve 35 serviços e 39 testes; **o diretório não tem um único `.ts`**.
- Docs e `.env.example` prometem OpenAI GPT-4V; o motor real é Lovable AI Gateway com
  `google/gemini-1.5-flash`.
- Twilio, SendGrid, Slack e Bitrix24 prometidos: **zero ocorrências no código**.

---

## O que está bom — sem distorcer o quadro

Isto é real e medido, não cortesia:

- **Segurança de acesso a dados:** RLS habilitado em **169 de 169 tabelas**, com 406 policies.
  Não há tabela exposta sem política.
- **Automonitoramento que funciona:** `db_health_snapshots` (4.305 registros, a cada 10 min),
  `cron_watchdog_runs` (376), `agent_healing_runs` (3.009), `camera_vault_audit` (878). Essa
  camada está viva e gravando.
- **Retenção e purga funcionando:** as tabelas `*_purge_runs` mostram limpeza acontecendo de fato.
- **Qualidade dos testes que existem:** onde há teste Vitest, ele é honesto — 1.644 casos,
  3.452 asserções (2,1 por caso), **zero arquivos sem asserção**, e 159 de 163 importam de fato o
  alvo que dizem testar. O problema é cobertura e runner, não teste falso.
- **Organização do código:** arquitetura clara, tipagem consistente, separação de responsabilidades
  legível. O trabalho de engenharia está lá.
- **Diagnóstico embutido:** o próprio sistema registra os erros que permitiram esta auditoria
  (`edge_function_error_audit`, `cron.job_run_details`, `net._http_response`).

---

## O que esta auditoria NÃO cobriu

Declarado, não escondido:

1. **Nenhum teste, lint ou build foi executado.** `node_modules` não está instalado neste ambiente.
   Nada aqui afirma que o código compila ou que testes passam.
2. **Logs das Edge Functions e lista de funções deployadas:** `NAO_VERIFICADO` — exige token de
   gestão Supabase, ausente nesta sessão.
3. **Segredos e variáveis de ambiente de produção:** invisíveis. Vários achados de "credencial
   ausente" são inferidos de dados (`telegram_not_configured`), não de leitura da configuração.
4. **Nenhuma tela foi aberta ou navegada.** Não há verificação visual ou de comportamento real.
5. **Conclusão real dos checks de CI históricos:** só observei o PR #88.
6. **Evidência nominal:** 361 arquivos citados com `arquivo:linha`. A varredura agregada (grafo de
   imports, grep de chamadores, contagem de objetos) cobriu 100% da árvore, mas **não há citação
   nominal para cada um dos ~2.500 arquivos** — escopos grandes foram inventariados por altitude.
7. **Retenção curta do `pg_net`:** os 1.536 registros cobrem ~6h. A conclusão de 0% de sucesso vale
   para essa janela; é consistente com as tabelas vazias há meses, mas a janela é o que medi.
8. **Não rastreei linha a linha** quais registros vieram de seed e quais de uso orgânico.

---

## Próximos passos, por valor

### Barato, seguro e reversível — posso fazer sozinho se você autorizar

| #   | Ação                                                                                                                                                                                   | Efeito                                |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| 1   | **Remover `"@swc/core-win32-x64-msvc"` de `dependencies` em `package.json:352`** e regenerar o lockfile em Linux. Mexer só no lock não resolve — o `npm install` seguinte o reintroduz | Destrava **todo** o CI do repositório |
| 2   | Remover ou implementar os 9 workflows `\|\| true`                                                                                                                                      | Elimina 9 fontes de falso-verde       |
| 3   | Alinhar `supabase/config.toml:1` e `.env.production` para o projeto correto                                                                                                            | Pré-requisito do item 5               |
| 4   | Apagar as 22 tabelas-partição órfãs vazias e seus 110 índices                                                                                                                          | Remove ilusão de particionamento      |
| 5   | Corrigir a documentação invertida (`FUNCIONALIDADES_COMPLETAS.md`, os 5 READMEs ficcionais)                                                                                            | Para de contaminar quem lê primeiro   |

### Toca produção — decisão sua, não minha

| #   | Ação                                                                       | Risco                                                                                                                                                                            |
| --- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 6   | **Reapontar os 14 cron jobs para o host correto**                          | É _a_ correção de maior impacto. Cuidado: ao voltar a funcionar, 14 rotinas adormecidas passam a executar de uma vez sobre 26.879 alertas abertos (19 `critical`, 26.821 `high`) |
| 7   | Corrigir `evaluate_maintenance_alerts()` linha 226 (qualificar `severity`) | Uma linha; volta a emitir alertas represados                                                                                                                                     |
| 8   | Configurar canal de notificação (Telegram ou outro)                        | Sem isso, itens 6 e 7 detectam e continuam sem avisar ninguém                                                                                                                    |
| 9   | Alinhar `get_camera_stream_url` (nome de parâmetro `p_` × `_`)             | Restaura o fallback hoje inoperante                                                                                                                                              |
| 10  | Remover os 3 caminhos que fabricam dado e gravam no banco                  | Elimina risco de ficção apresentada como detecção real                                                                                                                           |
| 11  | Fechar `verify_jwt` das 6 funções com `service_role`                       | Superfície exposta                                                                                                                                                               |

**Ordem recomendada:** 1 → 3 → 8 → 6 → 7. Destravar o CI primeiro dá rede de segurança para o
resto; configurar notificação antes de religar o cron evita que a enxurrada de alertas volte a
morrer silenciosa.

---

## Documentos de detalhe

| Arquivo                          | Conteúdo                                                                                        |
| -------------------------------- | ----------------------------------------------------------------------------------------------- |
| `docs/estado/_FATOS_RUNTIME.md`  | Medições brutas do banco, base factual comum                                                    |
| `docs/estado/01-FRONTEND.md`     | Rotas, páginas, componentes, dado fictício                                                      |
| `docs/estado/02-LOGICA.md`       | Hooks, lib, stores, feature flags, refactors abandonados                                        |
| `docs/estado/03-BACKEND-EDGE.md` | 74 Edge Functions e quem chama cada uma                                                         |
| `docs/estado/04-DADOS.md`        | Migrations, drift, seeds, reconstrutibilidade                                                   |
| `docs/estado/05-INFRA-CI.md`     | 42 workflows, 319 scripts, alvos de deploy                                                      |
| `docs/estado/06-INTEGRACOES.md`  | 50 integrações e divergências doc × código                                                      |
| `docs/estado/07-TESTES.md`       | O que os testes protegem de fato                                                                |
| `docs/estado/08-RUNTIME.md`      | Produção observada, com blocos de correção                                                      |
| `docs/estado/09-VALIDACAO.md`    | **A auditoria testada contra si mesma** — 466 citações conferidas, 3 erros e 2 gaps encontrados |

**Correções registradas durante a auditoria** (achados revisados, com o original preservado):
particionamento — eu havia classificado como ponto positivo e estava errado; dado fabricado —
o código é real, mas a contaminação alegada dos dados não ocorreu. Ambas em `08-RUNTIME.md`.
