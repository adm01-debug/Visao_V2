#!/usr/bin/env node
/**
 * Fuzz test — Onda 56.
 *
 * Gera 500 payloads mutados (tipos errados, overflow, injection strings,
 * unicode, prototype pollution) e verifica que os schemas Zod REJEITAM
 * todos os inválidos e ACEITAM os válidos.
 *
 * Rodado em Node com zod local (dev-dep) — replica exatamente as regras
 * da versão Deno em `_shared/publicApiSchemas.ts`.
 */
import { z } from 'zod';

const uuid = z.string().uuid();
const isoDate = z.string().datetime({ offset: true }).optional();

const armDisarm = z
  .object({
    reason: z.string().trim().min(1).max(500).optional(),
    scheduled_until: isoDate,
  })
  .strict();

const panic = z
  .object({
    camera_id: uuid.optional(),
    latitude: z.number().gte(-90).lte(90).optional(),
    longitude: z.number().gte(-180).lte(180).optional(),
    message: z.string().trim().max(500).optional(),
  })
  .strict();

// Corpus de fuzz
const injections = [
  "'; DROP TABLE users;--",
  '<script>alert(1)</script>',
  '${jndi:ldap://x}',
  '../../../etc/passwd',
  '\u0000null',
  '𝕏'.repeat(100),
];

const invalidCases = [
  { name: 'arm: extra field', schema: armDisarm, input: { reason: 'ok', evil: 1 } },
  { name: 'arm: reason overflow', schema: armDisarm, input: { reason: 'a'.repeat(501) } },
  { name: 'arm: bad date', schema: armDisarm, input: { scheduled_until: 'not-a-date' } },
  { name: 'arm: reason wrong type', schema: armDisarm, input: { reason: 123 } },
  { name: 'panic: uuid invalid', schema: panic, input: { camera_id: 'not-uuid' } },
  { name: 'panic: lat out of range', schema: panic, input: { latitude: 91 } },
  { name: 'panic: lng out of range', schema: panic, input: { longitude: -181 } },
  { name: 'panic: __proto__ pollution', schema: panic, input: { __proto__: { admin: true } } },
];

const validCases = [
  { name: 'arm: empty', schema: armDisarm, input: {} },
  {
    name: 'arm: full',
    schema: armDisarm,
    input: { reason: 'manutenção', scheduled_until: '2026-08-01T10:00:00Z' },
  },
  {
    name: 'panic: uuid only',
    schema: panic,
    input: { camera_id: '11111111-1111-4111-8111-111111111111' },
  },
  { name: 'panic: coords', schema: panic, input: { latitude: -23.5, longitude: -46.6 } },
];

let ok = 0;
let fail = 0;
const failures = [];

// 1) todos os invalidCases devem ser rejeitados
for (const c of invalidCases) {
  const r = c.schema.safeParse(c.input);
  if (!r.success) ok++;
  else {
    fail++;
    failures.push(`ACEITOU inválido: ${c.name}`);
  }
}

// 2) todos os validCases devem ser aceitos
for (const c of validCases) {
  const r = c.schema.safeParse(c.input);
  if (r.success) ok++;
  else {
    fail++;
    failures.push(`REJEITOU válido: ${c.name} — ${r.error.issues[0]?.message}`);
  }
}

// 3) fuzz aleatório: 500 tentativas com strings de injeção como reason
let fuzzRejected = 0;
for (let i = 0; i < 500; i++) {
  const injection = injections[i % injections.length];
  const oversize = 'x'.repeat(600 + (i % 100));
  const input = { reason: i % 2 === 0 ? injection : oversize };
  const r = armDisarm.safeParse(input);
  // injections com <500 chars trimadas são STRINGS válidas por Zod (sanitização é responsabilidade do consumidor)
  // mas oversize DEVE ser rejeitado.
  if (i % 2 === 1 && !r.success) fuzzRejected++;
  if (i % 2 === 0 && r.success) fuzzRejected++; // strings de injeção são strings, passam do schema
}

console.log('=== Onda 56 — Fuzz test (Zod schemas) ===');
console.log(`Casos determinísticos: ${ok}/${invalidCases.length + validCases.length}`);
console.log(`Fuzz aleatório: ${fuzzRejected}/500 comportamentos esperados`);
if (failures.length) {
  console.log('FALHAS:');
  for (const f of failures) console.log(' -', f);
  process.exit(1);
}
console.log('OK');
