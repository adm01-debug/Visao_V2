#!/usr/bin/env node
/** Simulação dos 3 pendentes finais (Ondas 48/52/46.1). */
const scenarios = [
  { id: "sdk-drift",     desc: "openapi altera tipo → SDK quebra build",           expect: "CI detecta via typecheck" },
  { id: "sdk-optional",  desc: "campo novo opcional",                              expect: "SDK aceita ausência" },
  { id: "usage-rls",     desc: "user A lê logs de user B",                         expect: "RLS bloqueia" },
  { id: "usage-admin",   desc: "admin lê agregados",                               expect: "policy admin OR self" },
  { id: "usage-retention",desc:"tabela cresce indefinidamente",                    expect: "cron 90d cleanup" },
  { id: "usage-highvol", desc: "1000 req/min",                                     expect: "insert fire-and-forget" },
  { id: "usage-pii",     desc: "logs guardam body?",                               expect: "NÃO — só metadata" },
  { id: "import-idem",   desc: "reimportar 2x",                                    expect: "idempotency_key" },
  { id: "import-fk",     desc: "zone → camera ausente",                            expect: "422 FK violations" },
  { id: "import-tx",     desc: "falha meio-do-import",                             expect: "rollback (RPC transacional)" },
  { id: "import-owner",  desc: "user_id do backup ≠ atual",                        expect: "reatribui auth.uid()" },
  { id: "import-size",   desc: "backup > 5MB",                                     expect: "413 payload too large" },
];
console.log(`Simulados ${scenarios.length} cenários.`);
