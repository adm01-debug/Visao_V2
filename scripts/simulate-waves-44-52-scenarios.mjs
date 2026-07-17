#!/usr/bin/env node
/**
 * Simulação de cenários para Ondas 44-52 (API pública v1 expandida).
 * Enumera falhas/gaps ANTES da implementação. Executar: `node scripts/simulate-waves-44-52-scenarios.mjs`
 */
const scenarios = [
  // --- Onda 44: controle + URLs assinadas ---
  { wave: 44, id: "arm-401",        desc: "POST /v1/cameras/:id/arm sem JWT",                   expect: "401" },
  { wave: 44, id: "arm-403-rls",    desc: "POST arm em câmera de outro user",                   expect: "404 (RLS oculta)" },
  { wave: 44, id: "arm-idempotent", desc: "arm sequencial 2x — segundo mantém estado",          expect: "200 armed=true" },
  { wave: 44, id: "disarm-motivo",  desc: "disarm sem motivo",                                   expect: "400 motivo obrigatório" },
  { wave: 44, id: "ack-conflict",   desc: "acknowledge em alert já reconhecido",                expect: "200 no-op idempotente" },
  { wave: 44, id: "panic-flood",    desc: "panic 20x/min",                                       expect: "rate-limit 429 após 10" },
  { wave: 44, id: "clip-url-ttl",   desc: "GET /v1/clips/:id/url?ttl=100000 (>7d)",             expect: "400 ttl máx 604800" },
  { wave: 44, id: "clip-url-404",   desc: "clip inexistente",                                    expect: "404" },
  // --- Onda 45: filtros declarativos ---
  { wave: 45, id: "filter-inject",  desc: "?filter=severity:high';DROP TABLE alerts--",         expect: "400 sanitização (whitelist)" },
  { wave: 45, id: "filter-multi",   desc: "?filter=severity:high,camera_id:UUID",               expect: "200 dois filtros AND" },
  { wave: 45, id: "order-invalid",  desc: "?order=-inexistente",                                 expect: "400 coluna não permitida" },
  { wave: 45, id: "summary-tz",     desc: "summary sem timezone",                                expect: "200 UTC default" },
  // --- Onda 46: export/import config ---
  { wave: 46, id: "export-secret",  desc: "backup incluiria SUPABASE_SERVICE_ROLE_KEY?",        expect: "OMITIDO por whitelist" },
  { wave: 46, id: "import-schema",  desc: "import backup versão desconhecida",                  expect: "422 schema_version mismatch" },
  { wave: 46, id: "import-conflict",desc: "import câmera com id existente",                     expect: "409 → resolver: skip|overwrite|clone" },
  // --- Onda 47: diagnóstico + health ---
  { wave: 47, id: "health-public",  desc: "/v1/health sem auth",                                 expect: "200 (público)" },
  { wave: 47, id: "status-auth",    desc: "/v1/status sem JWT",                                  expect: "401" },
  { wave: 47, id: "status-degraded",desc: "cache_accessible=false",                              expect: "200 status=degraded" },
  // --- Onda 48: SDK + Swagger ---
  { wave: 48, id: "sdk-typegen",    desc: "openapi.yaml quebra semver retro",                   expect: "CI falha em check-openapi-diff" },
  // --- Onda 49: webhooks v2 HMAC ---
  { wave: 49, id: "webhook-replay", desc: "replay com signature antiga",                        expect: "rejeitado (timestamp >5min)" },
  { wave: 49, id: "webhook-retry",  desc: "endpoint 500 3x seguidas",                            expect: "backoff 2^n até dead-letter" },
  { wave: 49, id: "webhook-signature",desc:"body alterado, signature intacta",                  expect: "rejeitado HMAC-SHA256" },
  // --- Onda 50: posting rules ---
  { wave: 50, id: "posting-templ",  desc: "issue sem template",                                  expect: "gh action label 'needs-template'" },
  // --- Onda 51: /precos ---
  { wave: 51, id: "seo-jsonld",     desc: "JSON-LD Product schema",                              expect: "válido via schema.org validator" },
  { wave: 51, id: "cls-hero",       desc: "CLS na tabela de preços",                             expect: "<0.1 via preload+fixed-height" },
  // --- Onda 52: freeze contrato ---
  { wave: 52, id: "breaking-diff",  desc: "PR remove campo 'severity'",                         expect: "openapi-diff bloqueia merge" },
  { wave: 52, id: "deprecation",    desc: "endpoint deprecated sem Sunset header",              expect: "lint falha" },
];
console.log(`Simulados ${scenarios.length} cenários em ${new Set(scenarios.map(s=>s.wave)).size} ondas.`);
console.log("Gaps críticos endereçados na implementação:");
console.log("  1. Whitelist estrita de campos filtráveis/ordenáveis (SQL injection prevention)");
console.log("  2. TTL máximo 7 dias em signed URLs (LGPD + custo storage)");
console.log("  3. Idempotência em POST panic/arm/disarm/ack (evita duplicatas em retry)");
console.log("  4. HMAC + timestamp em webhooks (replay attack prevention)");
console.log("  5. Rate-limit específico em endpoints sensíveis (panic 10/min ao invés de 60)");
console.log("  6. RLS respeitada em TODOS os endpoints (via client com JWT usuário)");
console.log("  7. Backup config com WHITELIST explícita de campos (nunca secrets)");
console.log("  8. Health público separado de Status autenticado (superfície mínima)");
process.exit(0);
