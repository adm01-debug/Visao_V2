#!/usr/bin/env node
// Wave 40 — Fuzz de política de retenção de clips.
// Invariantes:
//   1. critical + keepCritical → nunca expira
//   2. defaultDays=0 sem override → nunca expira
//   3. override por objeto > defaultDays quando presente
//   4. isClipExpired é monotônico em `now`
import { computeExpiryDate, isClipExpired, resolveRetentionDays } from '../src/lib/clipRetention.ts';

const CLASSES = ['person', 'vehicle', 'plate', 'face', 'ppe', 'other', undefined];
const N = 500;
let pass = 0, fail = 0;

function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(arr) { return arr[rand(0, arr.length - 1)]; }

for (let i = 0; i < N; i++) {
  const policy = {
    defaultDays: rand(0, 365),
    perObject: Math.random() < 0.6 ? { plate: rand(0, 400), face: rand(0, 400) } : undefined,
    keepCritical: Math.random() < 0.7,
  };
  const cls = pick(CLASSES);
  const critical = Math.random() < 0.2;
  const created = new Date(Date.now() - rand(1, 500) * 86400000);
  const clip = { createdAt: created, objectClass: cls, critical };

  const exp = computeExpiryDate(clip, policy);

  // Inv 1
  if (critical && policy.keepCritical && exp !== null) { fail++; continue; }
  // Inv 2
  if (!critical && policy.defaultDays === 0 && (!cls || !policy.perObject?.[cls]) && exp !== null) { fail++; continue; }
  // Inv 3
  const days = resolveRetentionDays(policy, cls);
  if (cls && policy.perObject?.[cls] != null && days !== policy.perObject[cls]) { fail++; continue; }
  // Inv 4 (monotônico)
  const now1 = new Date(created.getTime() + days * 86400000 - 1);
  const now2 = new Date(created.getTime() + days * 86400000 + 1);
  const e1 = isClipExpired(clip, policy, now1);
  const e2 = isClipExpired(clip, policy, now2);
  if (exp && e1 && !e2) { fail++; continue; }

  pass++;
}

const out = { total: N, pass, fail };
console.log(JSON.stringify(out, null, 2));
if (fail > 0) process.exit(1);
