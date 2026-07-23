import { describe, expect, it } from "vitest";
import {
  ONVIF_PROFILES,
  getProfileById,
  resolveProfileByHardwareId,
  resolveProfileByManufacturer,
} from "../onvifProfiles";
import { RTSP_TEMPLATES, findTemplate, renderTemplate } from "../rtspTemplates";


describe("onvifProfiles catalog", () => {
  it("expõe o perfil XiongMai NBD80X", () => {
    const p = getProfileById("xiongmai-nbd80x");
    expect(p).not.toBeNull();
    expect(p?.onvifPort).toBe(8899);
    expect(p?.onvifPortFallbacks).toEqual([80, 8080]);
    expect(p?.discoveryHints.probeTypes).toEqual([
      "dn:NetworkVideoTransmitter",
      "tds:Device",
    ]);
    expect(p?.rtspVariants.some((v) => v.recommended)).toBe(true);
  });

  it("resolve NBD80X08S-QWG-V3 → xiongmai-nbd80x (match por prefixo)", () => {
    expect(resolveProfileByHardwareId("NBD80X08S-QWG-V3")?.id).toBe("xiongmai-nbd80x");
    expect(resolveProfileByHardwareId("nbd80x16s-abc")?.id).toBe("xiongmai-nbd80x");
    expect(resolveProfileByHardwareId("DS-7608NI")).toBeNull();
  });

  it("resolve por Manufacturer (XiongMai/HZXM/XM) quando Model é desconhecido", () => {
    expect(resolveProfileByManufacturer("XiongMai", "unknown")?.id).toBe("xiongmai-nbd80x");
    expect(resolveProfileByManufacturer("HZXM", null)?.id).toBe("xiongmai-nbd80x");
    expect(resolveProfileByManufacturer("XM", "")?.id).toBe("xiongmai-nbd80x");
    expect(resolveProfileByManufacturer("Hikvision", "DS-2CD")).toBeNull();
  });

  it("todas as variantes RTSP do perfil apontam para templates existentes", () => {
    for (const profile of ONVIF_PROFILES) {
      for (const v of profile.rtspVariants) {
        expect(findTemplate(v.brand, v.templateId), `${v.brand}/${v.templateId}`).toBeDefined();
      }
    }
  });

  it("variantes XiongMai renderizam URLs exatas extraídas do firmware (channel=3)", () => {
    const ctx = { host: "192.168.1.50", port: 554, channel: 3 };

    const live = findTemplate("usecam", "xiongmai-live-chnn")!;
    expect(renderTemplate(live, ctx)).toEqual({
      primary: "rtsp://192.168.1.50/live/ch03_0",
      substream: "rtsp://192.168.1.50/live/ch03_1",
    });

    const h264 = findTemplate("usecam", "xiongmai-h264-ch")!;
    expect(renderTemplate(h264, ctx)).toEqual({
      primary: "rtsp://192.168.1.50/H264/ch3/main/av_stream",
      substream: "rtsp://192.168.1.50/H264/ch3/sub/av_stream",
    });

    const mpeg4 = findTemplate("usecam", "xiongmai-mpeg4-ch")!;
    expect(renderTemplate(mpeg4, ctx)).toEqual({
      primary: "rtsp://192.168.1.50/mpeg4/ch3/main/av_stream",
      substream: "rtsp://192.168.1.50/mpeg4/ch3/sub/av_stream",
    });

    const legacy = findTemplate("usecam", "usecam-xmeye-legacy")!;
    expect(renderTemplate(legacy, ctx).primary).toBe(
      "rtsp://192.168.1.50/user=admin&password=&channel=3&stream=0.sdp",
    );
  });
});
