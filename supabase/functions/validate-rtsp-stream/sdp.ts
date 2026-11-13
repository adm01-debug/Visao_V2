// Parser SDP robusto para extração de codec, resolução e fps.
// Trabalha exclusivamente sobre a seção `m=video` e agrega várias
// fontes possíveis (rtpmap, fmtp, a=framerate, a=x-framerate, a=cliprect,
// a=x-dimensions, a=framesize, sprop-parameter-sets/H.264 SPS).

import { decodeBase64 } from 'https://deno.land/std@0.224.0/encoding/base64.ts';

export interface SdpInfo {
  codec: string | null;
  resolution: string | null;
  width: number | null;
  height: number | null;
  fps: number | null;
  fpsSource: 'framerate' | 'x-framerate' | 'fmtp' | 'sps-timing' | null;
  resolutionSource: 'cliprect' | 'x-dimensions' | 'framesize' | 'fmtp' | 'sps' | null;
}

const EMPTY: SdpInfo = {
  codec: null,
  resolution: null,
  width: null,
  height: null,
  fps: null,
  fpsSource: null,
  resolutionSource: null,
};

function normalizeCodec(name: string): string {
  const c = name.toUpperCase();
  if (c === 'H264') return 'H.264';
  if (c === 'H265' || c === 'HEVC') return 'H.265';
  return c;
}

function pickVideoSection(body: string): string[] {
  const lines = body.split(/\r?\n/).map((l) => l.trimEnd());
  const out: string[] = [];
  let inVideo = false;
  for (const line of lines) {
    if (line.startsWith('m=')) {
      inVideo = line.startsWith('m=video');
      continue;
    }
    if (inVideo) out.push(line);
  }
  // Fallback: se não achou seção m=video, usa o SDP inteiro.
  return out.length > 0 ? out : lines;
}

function parseFmtpParams(line: string): Record<string, string> {
  // Ex.: a=fmtp:96 packetization-mode=1;profile-level-id=64001e;sprop-parameter-sets=...
  const idx = line.indexOf(' ');
  if (idx < 0) return {};
  const params = line.slice(idx + 1).split(';');
  const out: Record<string, string> = {};
  for (const p of params) {
    const eq = p.indexOf('=');
    if (eq > 0) {
      out[p.slice(0, eq).trim().toLowerCase()] = p.slice(eq + 1).trim();
    }
  }
  return out;
}

// ===== H.264 SPS parsing =====
// Extrai (width,height) e, quando disponível, fps a partir do vui timing_info.

class BitReader {
  private bytes: Uint8Array;
  private pos = 0; // bit position
  constructor(bytes: Uint8Array) {
    this.bytes = bytes;
  }
  private bit(): number {
    const bytePos = this.pos >> 3;
    const bitPos = 7 - (this.pos & 7);
    this.pos++;
    if (bytePos >= this.bytes.length) return 0;
    return (this.bytes[bytePos] >> bitPos) & 1;
  }
  u(n: number): number {
    let v = 0;
    for (let i = 0; i < n; i++) v = (v << 1) | this.bit();
    return v >>> 0;
  }
  ue(): number {
    let zeros = 0;
    while (zeros < 32 && this.bit() === 0) zeros++;
    return (1 << zeros) - 1 + this.u(zeros);
  }
  se(): number {
    const k = this.ue();
    return k & 1 ? (k + 1) >> 1 : -(k >> 1);
  }
  hasMore(): boolean {
    return this.pos >> 3 < this.bytes.length;
  }
}

function stripEmulationPrevention(src: Uint8Array): Uint8Array {
  const out: number[] = [];
  for (let i = 0; i < src.length; i++) {
    if (i + 2 < src.length && src[i] === 0 && src[i + 1] === 0 && src[i + 2] === 3) {
      out.push(0, 0);
      i += 2;
    } else {
      out.push(src[i]);
    }
  }
  return new Uint8Array(out);
}

interface SpsInfo {
  width: number;
  height: number;
  fps: number | null;
}

function parseH264Sps(nalu: Uint8Array): SpsInfo | null {
  try {
    if (nalu.length < 4) return null;
    // nalu[0] = forbidden_zero_bit + nal_ref_idc + nal_unit_type
    const rbsp = stripEmulationPrevention(nalu.slice(1));
    const br = new BitReader(rbsp);

    const profile_idc = br.u(8);
    br.u(8); // constraint_set + reserved
    br.u(8); // level_idc
    br.ue(); // seq_parameter_set_id

    let chroma_format_idc = 1;
    if ([100, 110, 122, 244, 44, 83, 86, 118, 128, 138, 139, 134, 135].includes(profile_idc)) {
      chroma_format_idc = br.ue();
      if (chroma_format_idc === 3) br.u(1); // separate_colour_plane_flag
      br.ue(); // bit_depth_luma_minus8
      br.ue(); // bit_depth_chroma_minus8
      br.u(1); // qpprime_y_zero_transform_bypass_flag
      const seq_scaling_matrix_present_flag = br.u(1);
      if (seq_scaling_matrix_present_flag) {
        const n = chroma_format_idc !== 3 ? 8 : 12;
        for (let i = 0; i < n; i++) {
          const present = br.u(1);
          if (present) {
            // pular lista de escala — leitura simplificada
            const size = i < 6 ? 16 : 64;
            let last = 8,
              next = 8;
            for (let j = 0; j < size; j++) {
              if (next !== 0) {
                const delta = br.se();
                next = (last + delta + 256) % 256;
              }
              last = next === 0 ? last : next;
            }
          }
        }
      }
    }

    br.ue(); // log2_max_frame_num_minus4
    const pic_order_cnt_type = br.ue();
    if (pic_order_cnt_type === 0) {
      br.ue(); // log2_max_pic_order_cnt_lsb_minus4
    } else if (pic_order_cnt_type === 1) {
      br.u(1);
      br.se();
      br.se();
      const n = br.ue();
      for (let i = 0; i < n; i++) br.se();
    }
    br.ue(); // max_num_ref_frames
    br.u(1); // gaps_in_frame_num_value_allowed_flag
    const pic_width_in_mbs_minus1 = br.ue();
    const pic_height_in_map_units_minus1 = br.ue();
    const frame_mbs_only_flag = br.u(1);
    if (!frame_mbs_only_flag) br.u(1); // mb_adaptive_frame_field_flag
    br.u(1); // direct_8x8_inference_flag

    const frame_cropping_flag = br.u(1);
    let crop_left = 0,
      crop_right = 0,
      crop_top = 0,
      crop_bottom = 0;
    if (frame_cropping_flag) {
      crop_left = br.ue();
      crop_right = br.ue();
      crop_top = br.ue();
      crop_bottom = br.ue();
    }

    let width = (pic_width_in_mbs_minus1 + 1) * 16;
    let height = (2 - frame_mbs_only_flag) * (pic_height_in_map_units_minus1 + 1) * 16;

    const subWidthC = chroma_format_idc === 1 || chroma_format_idc === 2 ? 2 : 1;
    const subHeightC = chroma_format_idc === 1 ? 2 : 1;
    width -= (crop_left + crop_right) * subWidthC;
    height -= (crop_top + crop_bottom) * subHeightC * (2 - frame_mbs_only_flag);

    // VUI para fps
    let fps: number | null = null;
    const vui_parameters_present_flag = br.u(1);
    if (vui_parameters_present_flag) {
      const aspect_ratio_info_present_flag = br.u(1);
      if (aspect_ratio_info_present_flag) {
        const aspect_ratio_idc = br.u(8);
        if (aspect_ratio_idc === 255) {
          br.u(16);
          br.u(16);
        }
      }
      const overscan_info_present_flag = br.u(1);
      if (overscan_info_present_flag) br.u(1);
      const video_signal_type_present_flag = br.u(1);
      if (video_signal_type_present_flag) {
        br.u(3);
        br.u(1);
        const colour_description_present_flag = br.u(1);
        if (colour_description_present_flag) {
          br.u(8);
          br.u(8);
          br.u(8);
        }
      }
      const chroma_loc_info_present_flag = br.u(1);
      if (chroma_loc_info_present_flag) {
        br.ue();
        br.ue();
      }
      const timing_info_present_flag = br.u(1);
      if (timing_info_present_flag) {
        const num_units_in_tick = br.u(32);
        const time_scale = br.u(32);
        if (num_units_in_tick > 0) {
          const raw = time_scale / (2 * num_units_in_tick);
          if (Number.isFinite(raw) && raw > 0 && raw < 240) {
            fps = Math.round(raw);
          }
        }
      }
    }

    if (width <= 0 || height <= 0) return null;
    return { width, height, fps };
  } catch {
    return null;
  }
}

function tryParseSpropParameterSets(spropB64: string): SpsInfo | null {
  // "sprop-parameter-sets" pode conter múltiplos NALUs separados por vírgula.
  const parts = spropB64
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  for (const part of parts) {
    try {
      const bytes = decodeBase64(part);
      if (bytes.length === 0) continue;
      const nalType = bytes[0] & 0x1f;
      if (nalType === 7) {
        const info = parseH264Sps(bytes);
        if (info) return info;
      }
    } catch {
      /* ignore */
    }
  }
  return null;
}

export function parseSdp(body: string): SdpInfo {
  if (!body || body.length === 0) return { ...EMPTY };
  const lines = pickVideoSection(body);

  let codec: string | null = null;
  let width: number | null = null;
  let height: number | null = null;
  let resolutionSource: SdpInfo['resolutionSource'] = null;
  let fps: number | null = null;
  let fpsSource: SdpInfo['fpsSource'] = null;
  let fmtpLine: string | null = null;

  for (const line of lines) {
    // rtpmap: codec + clock rate (90000 típico para vídeo, mas não indica fps).
    const rt = line.match(/^a=rtpmap:\d+\s+([A-Za-z0-9-]+)\/(\d+)/i);
    if (rt && !codec) codec = normalizeCodec(rt[1]);

    // fmtp: fonte primária de sprop-parameter-sets em H.264.
    if (line.startsWith('a=fmtp:') && !fmtpLine) fmtpLine = line;

    // a=cliprect: ONVIF — "a=cliprect:0,0,1080,1920" (Y,X,H,W)
    const clip = line.match(/^a=cliprect:\s*\d+\s*,\s*\d+\s*,\s*(\d+)\s*,\s*(\d+)/i);
    if (clip && width === null) {
      // cliprect é (top,left,height,width) → transformar em WxH
      height = Number(clip[1]);
      width = Number(clip[2]);
      resolutionSource = 'cliprect';
    }

    // a=x-dimensions:1920,1080 (Axis, Bosch, alguns Hikvision)
    const xd = line.match(/^a=x-dimensions[:=]\s*(\d+)[,x](\d+)/i);
    if (xd && width === null) {
      width = Number(xd[1]);
      height = Number(xd[2]);
      resolutionSource = 'x-dimensions';
    }

    // a=framesize:96 1920-1080 (algumas Dahua/OEM)
    const fs = line.match(/^a=framesize:\s*\d+\s+(\d+)-(\d+)/i);
    if (fs && width === null) {
      width = Number(fs[1]);
      height = Number(fs[2]);
      resolutionSource = 'framesize';
    }

    // a=framerate:25 ou a=framerate:29.97
    const fr = line.match(/^a=framerate:\s*(\d+(?:\.\d+)?)/i);
    if (fr && fps === null) {
      const v = Number(fr[1]);
      if (Number.isFinite(v) && v > 0 && v < 240) {
        fps = Math.round(v);
        fpsSource = 'framerate';
      }
    }

    // a=x-framerate:25 (comum em ONVIF)
    const xfr = line.match(/^a=x-framerate:\s*(\d+(?:\.\d+)?)/i);
    if (xfr && fps === null) {
      const v = Number(xfr[1]);
      if (Number.isFinite(v) && v > 0 && v < 240) {
        fps = Math.round(v);
        fpsSource = 'x-framerate';
      }
    }
  }

  // Segunda passada: fmtp com width/height/framerate e sprop-parameter-sets.
  if (fmtpLine) {
    const params = parseFmtpParams(fmtpLine);
    if (width === null && params['width'] && params['height']) {
      const w = Number(params['width']);
      const h = Number(params['height']);
      if (w > 0 && h > 0) {
        width = w;
        height = h;
        resolutionSource = 'fmtp';
      }
    }
    if (fps === null && params['framerate']) {
      const v = Number(params['framerate']);
      if (Number.isFinite(v) && v > 0 && v < 240) {
        fps = Math.round(v);
        fpsSource = 'fmtp';
      }
    }
    // sprop-parameter-sets: SPS/PPS em base64 (H.264).
    const sprop = params['sprop-parameter-sets'];
    if (sprop && (codec === null || /H\.?264/i.test(codec ?? ''))) {
      const info = tryParseSpropParameterSets(sprop);
      if (info) {
        if (width === null) {
          width = info.width;
          height = info.height;
          resolutionSource = 'sps';
        }
        if (fps === null && info.fps !== null) {
          fps = info.fps;
          fpsSource = 'sps-timing';
        }
        if (codec === null) codec = 'H.264';
      }
    }
  }

  const resolution = width && height ? `${width}x${height}` : null;
  return {
    codec,
    resolution,
    width,
    height,
    fps,
    fpsSource,
    resolutionSource,
  };
}
