# Onda 108 — Simulação da drenagem da partição DEFAULT

Gerado em 2026-07-26T16:08:37.187Z

- Cenários simulados: **2880**
- Seguros: **696**
- Inseguros: **2184**

## Inseguros por estratégia
- `nenhuma`: 576
- `drenagem_cega`: 648
- `drenagem_criando_alvo`: 540
- `drenagem_com_quarentena`: 420

## Inseguros por desfecho
- `linhas_presas_sem_pruning`: 432
- `attach_bloqueado_por_scan_da_default`: 144
- `linha_orfa_sem_dono`: 1080
- `drenagem_falha_23514`: 120
- `transacao_gigante_lock_prolongado`: 144
- `contencao_com_o_cron`: 24
- `cria_particao_absurda_ou_falha`: 240

## Gaps previstos (a serem fechados pela migração)
1. Sem drenagem as linhas ficam fora da partição correta: pruning não se aplica e a consulta por período varre o balde.
2. DEFAULT populada força scan + ACCESS EXCLUSIVE ao criar a partição do mês seguinte: o cron trava a ingestão.
3. Drenagem via INSERT..SELECT sem carregar user_id gera linha órfã invisível ao dono e imune à RLS. Mover a linha inteira.
4. Drenagem cega falha quando a partição de destino ainda não existe: garantir o alvo antes de mover.
5. Drenagem sem lote em volume alto mantém lock longo e infla o WAL. Processar em lotes com commit por lote.
6. Lote grande concorrendo com a criação de partição gera contenção de lock. Usar lote pequeno e lock advisory entre as rotinas.
7. Timestamp absurdo (1970/2099) sem quarentena faz a rotina criar partições inúteis ou falhar em loop todo dia.
