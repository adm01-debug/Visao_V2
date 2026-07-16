# Wave 15 — Auto-partition management

- Cenários: **243**
- Unsafe: **0**
- Cobertura: 2 tabelas × 5 horizontes × 24 meses + rollover + concorrência + parent ausente
- Idempotência garantida via CREATE TABLE IF NOT EXISTS + grants condicionais
