import { it, expect } from 'vitest';
it('h', async () => {
  const e = new TextEncoder();
  const d1 = await crypto.subtle.digest('SHA-256', e.encode('a').buffer as ArrayBuffer);
  const d2 = await crypto.subtle.digest('SHA-256', e.encode('b').buffer as ArrayBuffer);
  expect(new Uint8Array(d1)[0]).not.toBe(new Uint8Array(d2)[0]);
});
