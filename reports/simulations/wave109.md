# Onda 109 — Triagem automática da quarentena da partição DEFAULT

- Gerado em: 2026-07-26T16:18:18.824Z
- Cenários simulados: **5760**
- Seguros: **336**
- Inseguros (exigem mitigação): **5424**

## Gaps identificados

| ID | Ocorrências | Risco | Mitigação adotada |
| --- | ---: | --- | --- |
| `G1_lock_contention` | 2560 | Triagem mutante executando junto da drenagem/criação de partições disputa o mesmo conjunto de linhas da DEFAULT. | Triagem adquire a MESMA advisory lock (partition_maintenance_lock_key) e registra locked_out=true ao invés de prosseguir. |
| `G5_orphan_rls` | 1920 | Mover/corrigir linha com user_id nulo ou órfão cria registro inalcançável pelas policies e invisível ao dono. | Linhas órfãs são classificadas no bucket `orphan_owner` e jamais corrigidas automaticamente. |
| `G3_destructive_purge` | 1920 | Descarte automático de detecções elimina evidência potencialmente probatória sem trilha de auditoria. | A rotina NUNCA apaga: purge não é implementado. Linhas irrecuperáveis permanecem na DEFAULT, apenas rotuladas. |
| `G2_unsafe_shift` | 1632 | Correção automática aplicada a anomalia sem hipótese determinística de offset fabricaria um timestamp falso. | auto_shift só é permitido quando a anomalia é shiftable E a causa possui offset inferido; caso contrário cai em classify_only. |
| `G8_invisible_debt` | 1440 | Classificação sem persistência não gera histórico: ninguém percebe a quarentena crescendo mês a mês. | Cada execução grava em `partition_quarantine_runs` (totais + buckets em jsonb) e o gate de CI avisa quando o total cresce. |
| `G4_full_scan_cost` | 1440 | Classificar 250k+ linhas linha a linha faz seq scan longo sobre a DEFAULT e concorre com INSERTs de câmera. | Classificação é feita por AGREGAÇÃO (count/min/max por bucket) em uma única passada, com STATEMENT timeout e amostragem de exemplos limitada. |
| `G7_window_drift` | 1440 | A janela plausível é relativa a now(); uma linha na borda alterna entre drenável e quarentenada conforme o dia da execução. | Triagem usa EXATAMENTE os mesmos months_back/months_ahead da drenagem e marca o bucket `drainable_pending` (não é quarentena real, só ainda não drenado). |
| `G6_null_key_blindspot` | 720 | Linha com chave de partição NULL não entra em nenhum range e some das agregações com WHERE por intervalo. | Bucket dedicado `null_key`, contabilizado com IS NULL explícito antes dos buckets por range. |
| `G9_sentinel_overflow` | 480 | Tentar derivar uma partição a partir de um sentinela (9999-12-31) cria range absurdo e polui o catálogo para sempre. | Sentinelas caem em `sentinel_far_future` e são explicitamente excluídos de qualquer caminho que crie partição. |
