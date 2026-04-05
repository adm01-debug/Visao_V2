/**
 * Lazy loader for HLS.js — avoids bundling hls.js in the initial chunk.
 * Usage: const Hls = await getHls();
 */

type HlsType = typeof import('hls.js').default;
let _Hls: HlsType | null = null;

export async function getHls(): Promise<HlsType> {
  if (!_Hls) {
    const mod = await import('hls.js');
    _Hls = mod.default;
  }
  return _Hls;
}

export function getCachedHls(): HlsType | null {
  return _Hls;
}
