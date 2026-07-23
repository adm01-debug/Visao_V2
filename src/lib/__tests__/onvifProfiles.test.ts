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

  it("marca canônica 'xiongmai' expõe exatamente 6 templates confirmados pelo firmware", () => {
    const templates = RTSP_TEMPLATES.xiongmai;
    expect(templates.map((t) => t.id).sort()).toEqual(
      ["xm-dahua-compat", "xm-h264-ch", "xm-hik-compat", "xm-live-chnn", "xm-mpeg4-ch", "xm-xmeye-legacy"].sort(),
    );
    expect(templates.every((t) => t.defaultPort === 554)).toBe(true);
  });

  it("templates 'xiongmai' renderizam URLs exatas extraídas do firmware Sofia (channel=3)", () => {
    const ctx = { host: "192.168.1.50", port: 554, channel: 3 };

    const legacy = findTemplate("xiongmai", "xm-xmeye-legacy")!;
    expect(renderTemplate(legacy, ctx)).toEqual({
      primary: "rtsp://192.168.1.50/user=admin&password=&channel=3&stream=0.sdp",
      substream: "rtsp://192.168.1.50/user=admin&password=&channel=3&stream=1.sdp",
    });

    const live = findTemplate("xiongmai", "xm-live-chnn")!;
    expect(renderTemplate(live, ctx)).toEqual({
      primary: "rtsp://192.168.1.50/live/ch03_0",
      substream: "rtsp://192.168.1.50/live/ch03_1",
    });

    const h264 = findTemplate("xiongmai", "xm-h264-ch")!;
    expect(renderTemplate(h264, ctx)).toEqual({
      primary: "rtsp://192.168.1.50/H264/ch3/main/av_stream",
      substream: "rtsp://192.168.1.50/H264/ch3/sub/av_stream",
    });

    const mpeg4 = findTemplate("xiongmai", "xm-mpeg4-ch")!;
    expect(renderTemplate(mpeg4, ctx)).toEqual({
      primary: "rtsp://192.168.1.50/mpeg4/ch3/main/av_stream",
      substream: "rtsp://192.168.1.50/mpeg4/ch3/sub/av_stream",
    });

    const dahua = findTemplate("xiongmai", "xm-dahua-compat")!;
    expect(renderTemplate(dahua, ctx).primary).toBe(
      "rtsp://192.168.1.50/cam/realmonitor?channel=3&subtype=0",
    );

    const hik = findTemplate("xiongmai", "xm-hik-compat")!;
    expect(renderTemplate(hik, ctx).primary).toBe(
      "rtsp://192.168.1.50/Streaming/Channels/301",
    );
  });

  it("perfil xiongmai-nbd80x aponta variante recomendada para a marca canônica", () => {
    const p = getProfileById("xiongmai-nbd80x")!;
    const recommended = p.rtspVariants.find((v) => v.recommended)!;
    expect(recommended.brand).toBe("xiongmai");
    expect(recommended.templateId).toBe("xm-xmeye-legacy");
  });

});
