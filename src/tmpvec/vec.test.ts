import { describe, it } from 'vitest';
import { buildCustodyChain } from '../../src/lib/evidence/custodyManifest';
describe('vetor', () => { it('imprime', async () => {
const segs=[
 {index:0,storagePath:'cam/1/"aspas"\\barra\u001fctl/ó.mp4',byteSize:1048576,sha256:'a'.repeat(64),deviceStartUtc:'2026-07-27T10:00:00.000Z',deviceEndUtc:'2026-07-27T10:00:30.000Z',receivedAtUtc:'2026-07-27T10:00:31.000Z',clockOffsetMs:-1500},
 {index:1,storagePath:'cam/1/b.mp4',byteSize:0,sha256:'b'.repeat(64),deviceStartUtc:'2026-07-27T10:00:30.000Z',deviceEndUtc:'2026-07-27T10:01:00.000Z',receivedAtUtc:'2026-07-27T10:01:01.000Z',clockOffsetMs:0},
];
console.log('CHAIN='+JSON.stringify(await buildCustodyChain(segs)));
console.log('SEGS='+JSON.stringify(segs));
}); });
