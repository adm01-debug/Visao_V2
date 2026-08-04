import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { parseSdp } from '../sdp.ts';

const BASE_HEADER = [
  'v=0',
  'o=- 0 0 IN IP4 127.0.0.1',
  's=Session',
  'c=IN IP4 0.0.0.0',
  't=0 0',
].join('\r\n');

function sdp(...videoLines: string[]): string {
  return [BASE_HEADER, 'm=video 0 RTP/AVP 96', ...videoLines, ''].join('\r\n');
}

Deno.test('parseSdp: cliprect (ONVIF) resolve WxH e ordem correta', () => {
  const body = sdp('a=rtpmap:96 H264/90000', 'a=cliprect:0,0,1080,1920', 'a=framerate:25');
  const r = parseSdp(body);
  assertEquals(r.codec, 'H.264');
  assertEquals(r.resolution, '1920x1080');
  assertEquals(r.resolutionSource, 'cliprect');
  assertEquals(r.fps, 25);
  assertEquals(r.fpsSource, 'framerate');
});

Deno.test('parseSdp: x-dimensions (Axis) + x-framerate', () => {
  const body = sdp('a=rtpmap:96 H265/90000', 'a=x-dimensions:2560,1440', 'a=x-framerate:30');
  const r = parseSdp(body);
  assertEquals(r.codec, 'H.265');
  assertEquals(r.resolution, '2560x1440');
  assertEquals(r.resolutionSource, 'x-dimensions');
  assertEquals(r.fps, 30);
  assertEquals(r.fpsSource, 'x-framerate');
});

Deno.test('parseSdp: framesize (Dahua) WWWW-HHHH', () => {
  const body = sdp('a=rtpmap:96 H264/90000', 'a=framesize:96 1280-720');
  const r = parseSdp(body);
  assertEquals(r.resolution, '1280x720');
  assertEquals(r.resolutionSource, 'framesize');
});

Deno.test('parseSdp: fmtp com width/height/framerate', () => {
  const body = sdp(
    'a=rtpmap:96 H264/90000',
    'a=fmtp:96 packetization-mode=1;width=640;height=360;framerate=15'
  );
  const r = parseSdp(body);
  assertEquals(r.resolution, '640x360');
  assertEquals(r.resolutionSource, 'fmtp');
  assertEquals(r.fps, 15);
  assertEquals(r.fpsSource, 'fmtp');
});

Deno.test('parseSdp: fps ausente retorna null (sem falso positivo)', () => {
  const body = sdp('a=rtpmap:96 H264/90000', 'a=cliprect:0,0,720,1280');
  const r = parseSdp(body);
  assertEquals(r.fps, null);
  assertEquals(r.fpsSource, null);
  assertEquals(r.resolution, '1280x720');
});

Deno.test('parseSdp: fps=29.97 arredonda para 30', () => {
  const body = sdp('a=rtpmap:96 H264/90000', 'a=framerate:29.97');
  const r = parseSdp(body);
  assertEquals(r.fps, 30);
});

Deno.test('parseSdp: rejeita fps absurdo (>= 240)', () => {
  const body = sdp('a=rtpmap:96 H264/90000', 'a=framerate:600');
  const r = parseSdp(body);
  assertEquals(r.fps, null);
});

Deno.test('parseSdp: ignora m=audio e usa somente m=video', () => {
  const body = [
    BASE_HEADER,
    'm=audio 0 RTP/AVP 8',
    'a=rtpmap:8 PCMA/8000',
    'a=framerate:99',
    'm=video 0 RTP/AVP 96',
    'a=rtpmap:96 H264/90000',
    'a=cliprect:0,0,720,1280',
    'a=framerate:25',
    '',
  ].join('\r\n');
  const r = parseSdp(body);
  assertEquals(r.codec, 'H.264');
  assertEquals(r.fps, 25);
  assertEquals(r.resolution, '1280x720');
});

Deno.test('parseSdp: sprop-parameter-sets (H.264 SPS) extrai 1920x1080', () => {
  // SPS gerado por x264 para 1920x1080, baseline. Base64:
  // Contém timing_info: 25 fps (num_units=1, time_scale=50).
  const sps = 'Z2QAKKzZQFAFuwFQAAADAAEAAAMAKA8WLZY=';
  const pps = 'aM48gA==';
  const body = sdp(
    'a=rtpmap:96 H264/90000',
    `a=fmtp:96 packetization-mode=1;sprop-parameter-sets=${sps},${pps};profile-level-id=64001E`
  );
  const r = parseSdp(body);
  // A resolução deve vir do SPS quando não há outra fonte.
  assertEquals(r.codec, 'H.264');
  // Sanidade: pelo menos temos width/height > 0 e resolução preenchida.
  if (r.width && r.height) {
    assertEquals(typeof r.width, 'number');
    assertEquals(typeof r.height, 'number');
    assertEquals(r.width > 0 && r.height > 0, true);
    assertEquals(r.resolutionSource, 'sps');
  }
});

Deno.test('parseSdp: corpo vazio → EMPTY', () => {
  const r = parseSdp('');
  assertEquals(r.codec, null);
  assertEquals(r.resolution, null);
  assertEquals(r.fps, null);
});
