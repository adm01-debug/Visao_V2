import { it } from 'vitest';
import { buildCustodyChain, sha256Hex } from '../custodyManifest';
it('dbg', async () => {
  console.log(await sha256Hex(new TextEncoder().encode('a')));
  console.log(await sha256Hex(new TextEncoder().encode('b')));
  const s = (i: number) => ({ index: i, storagePath: 'p'+i, byteSize: 1, sha256: String(i).padStart(64,'a'), deviceStartUtc: '2026-01-01T00:00:00Z', deviceEndUtc: '2026-01-01T00:01:00Z', receivedAtUtc: '2026-01-01T00:01:01Z', clockOffsetMs: 0 });
  console.log(await buildCustodyChain([s(0), s(1)]));
  console.log(await buildCustodyChain([s(1), s(0)]));
});
