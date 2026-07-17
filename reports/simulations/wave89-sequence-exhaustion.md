# Onda 89 — Simulação: monitor de exaustão de sequences

**Executado:** 2026-07-17T17:34:03.112Z
**Cenários:** 240

## Distribuição por severidade esperada
- **ok**: 110
- **medium**: 50
- **high**: 32
- **critical**: 24
- **blocked**: 24

## Cobertura
- int4 exhaustion: ✅
- int8 headroom: ✅
- Sequences órfãs: ✅
- Cyclic-safe: ✅
- Permissões: ✅

## Notas
- Sequences cíclicas nunca são críticas mesmo em 99%.
- Sequences órfãs continuam sendo monitoradas — podem ser usadas por triggers.
- RPC exige has_role(admin) — usuários comuns recebem null.
- Estimativa de tempo até esgotamento usa taxa de consumo de 24h via pg_stat_user_sequences quando disponível.
