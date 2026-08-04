import { describe, it, expect } from 'vitest';
import {
  RTSP_TEMPLATES,
  findTemplate,
  getTemplatesForBrand,
  renderTemplate,
} from '@/lib/rtspTemplates';

describe('rtspTemplates', () => {
  it('has templates for all supported brands', () => {
    expect(RTSP_TEMPLATES.hikvision.length).toBeGreaterThan(0);
    expect(RTSP_TEMPLATES.dahua.length).toBeGreaterThan(0);
    expect(RTSP_TEMPLATES.intelbras.length).toBeGreaterThan(0);
    expect(RTSP_TEMPLATES.generica.length).toBeGreaterThan(0);
  });

  it('returns empty array for unknown brand', () => {
    expect(getTemplatesForBrand('nope')).toEqual([]);
  });

  it('resolves host, port and channel tokens', () => {
    const tpl = findTemplate('dahua', 'dahua-ipc')!;
    const { primary, substream } = renderTemplate(tpl, {
      host: '10.0.0.5',
      port: 8554,
      channel: 3,
    });
    expect(primary).toBe('rtsp://10.0.0.5:8554/cam/realmonitor?channel=3&subtype=0');
    expect(substream).toBe('rtsp://10.0.0.5:8554/cam/realmonitor?channel=3&subtype=1');
  });

  it('omits :port when equal to template default', () => {
    const tpl = findTemplate('hikvision', 'hik-ipc-main-sub')!;
    const { primary, substream } = renderTemplate(tpl, { host: 'cam.lan' });
    expect(primary).toBe('rtsp://cam.lan/Streaming/Channels/101');
    expect(substream).toBe('rtsp://cam.lan/Streaming/Channels/102');
  });

  it('supports zero-padded channel tokens (Reolink)', () => {
    const tpl = findTemplate('generica', 'reolink')!;
    const { primary, substream } = renderTemplate(tpl, { host: '192.168.1.20', channel: 1 });
    expect(primary).toBe('rtsp://192.168.1.20/h264Preview_01_main');
    expect(substream).toBe('rtsp://192.168.1.20/h264Preview_01_sub');
  });

  it('defaults channel to 1 when not provided', () => {
    const tpl = findTemplate('hikvision', 'hik-ipc-main-sub')!;
    const { primary } = renderTemplate(tpl, { host: 'h' });
    expect(primary).toContain('/Streaming/Channels/101');
  });

  it('omits substream field when template does not define one (Axis)', () => {
    const tpl = findTemplate('generica', 'axis')!;
    const { primary, substream } = renderTemplate(tpl, { host: 'axis.local' });
    expect(primary).toBe('rtsp://axis.local/axis-media/media.amp');
    expect(substream).toBeUndefined();
  });
});
