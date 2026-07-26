# Onda 107 — Simulação do ciclo de vida das partições

Gerado em 2026-07-26T16:02:09.567Z

- Cenários simulados: **4800**
- Seguros: **1596**
- Inseguros: **3204**

## Inseguros por descoberta do pai
- `hardcoded_conhecido`: 402
- `hardcoded_tabela_nova`: 1200
- `autodescoberto_pg_class`: 402
- `autodescoberto_sem_user_id`: 1200

## Inseguros por cadência
- `manual_nunca`: 834
- `manual_esporadico`: 834
- `cron_mensal`: 768
- `cron_diario`: 768

## Inseguros por desfecho
- `insert_falha_23514`: 1404
- `linha_cai_na_default_sem_rls`: 600
- `erro_42703_na_criacao_da_policy`: 1200

## Gaps previstos (a serem fechados pela migração)
1. Timestamp adiante do horizonte sem DEFAULT: relógio de câmera errado derruba a ingestão.
2. Backfill/retroativo antigo sem partição DEFAULT falha e derruba o job de importação.
3. Cobertura expirada (horizon=0, drift=1, cadência=manual_nunca): ingestão para.
4. Sobrevive, mas a DEFAULT vira hotspot: exige alerta de cobertura.
5. Cobertura expirada (horizon=0, drift=2, cadência=manual_nunca): ingestão para.
6. Cobertura expirada (horizon=0, drift=4, cadência=manual_nunca): ingestão para.
7. Cobertura expirada (horizon=0, drift=7, cadência=manual_nunca): ingestão para.
8. Cobertura expirada (horizon=0, drift=13, cadência=manual_nunca): ingestão para.
9. Cobertura expirada (horizon=1, drift=1, cadência=manual_nunca): ingestão para.
10. Cobertura expirada (horizon=1, drift=2, cadência=manual_nunca): ingestão para.
11. Cobertura expirada (horizon=1, drift=4, cadência=manual_nunca): ingestão para.
12. Cobertura expirada (horizon=1, drift=7, cadência=manual_nunca): ingestão para.
13. Cobertura expirada (horizon=1, drift=13, cadência=manual_nunca): ingestão para.
14. Cobertura expirada (horizon=3, drift=4, cadência=manual_nunca): ingestão para.
15. Cobertura expirada (horizon=3, drift=7, cadência=manual_nunca): ingestão para.
16. Cobertura expirada (horizon=3, drift=13, cadência=manual_nunca): ingestão para.
17. Cobertura expirada (horizon=6, drift=1, cadência=manual_nunca): ingestão para.
18. Cobertura expirada (horizon=6, drift=2, cadência=manual_nunca): ingestão para.
19. Cobertura expirada (horizon=6, drift=4, cadência=manual_nunca): ingestão para.
20. Cobertura expirada (horizon=6, drift=7, cadência=manual_nunca): ingestão para.
21. Cobertura expirada (horizon=6, drift=13, cadência=manual_nunca): ingestão para.
22. Cobertura expirada (horizon=12, drift=7, cadência=manual_nunca): ingestão para.
23. Cobertura expirada (horizon=12, drift=13, cadência=manual_nunca): ingestão para.
24. Cobertura expirada (horizon=0, drift=1, cadência=manual_esporadico): ingestão para.
25. Cobertura expirada (horizon=0, drift=2, cadência=manual_esporadico): ingestão para.
26. Cobertura expirada (horizon=0, drift=4, cadência=manual_esporadico): ingestão para.
27. Cobertura expirada (horizon=0, drift=7, cadência=manual_esporadico): ingestão para.
28. Cobertura expirada (horizon=0, drift=13, cadência=manual_esporadico): ingestão para.
29. Cobertura expirada (horizon=1, drift=1, cadência=manual_esporadico): ingestão para.
30. Cobertura expirada (horizon=1, drift=2, cadência=manual_esporadico): ingestão para.
31. Cobertura expirada (horizon=1, drift=4, cadência=manual_esporadico): ingestão para.
32. Cobertura expirada (horizon=1, drift=7, cadência=manual_esporadico): ingestão para.
33. Cobertura expirada (horizon=1, drift=13, cadência=manual_esporadico): ingestão para.
34. Cobertura expirada (horizon=3, drift=4, cadência=manual_esporadico): ingestão para.
35. Cobertura expirada (horizon=3, drift=7, cadência=manual_esporadico): ingestão para.
36. Cobertura expirada (horizon=3, drift=13, cadência=manual_esporadico): ingestão para.
37. Cobertura expirada (horizon=6, drift=1, cadência=manual_esporadico): ingestão para.
38. Cobertura expirada (horizon=6, drift=2, cadência=manual_esporadico): ingestão para.
39. Cobertura expirada (horizon=6, drift=4, cadência=manual_esporadico): ingestão para.
40. Cobertura expirada (horizon=6, drift=7, cadência=manual_esporadico): ingestão para.
41. Cobertura expirada (horizon=6, drift=13, cadência=manual_esporadico): ingestão para.
42. Cobertura expirada (horizon=12, drift=7, cadência=manual_esporadico): ingestão para.
43. Cobertura expirada (horizon=12, drift=13, cadência=manual_esporadico): ingestão para.
44. Pai particionado fora do ARRAY hardcoded nunca recebe partições: toda escrita falha.
45. Pai fora do ARRAY: DEFAULT recebe tudo e nasce sem RLS própria → vazamento cross-tenant no acesso direto.
46. Autodescoberta ingênua quebra em particionada sem user_id (42703). Filtrar pais por presença da coluna.
