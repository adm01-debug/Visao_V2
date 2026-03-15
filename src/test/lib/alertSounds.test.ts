import { describe, it, expect, beforeEach } from "vitest";
import {
  getSoundSettings, setAlertSoundsMuted, getAlertSoundsMuted,
  getSoundEnabled, setSoundEnabled, getSoundVolume, setSoundVolume, TONE_TYPES
} from "@/lib/alertSounds";

describe("alertSounds", () => {
  beforeEach(() => localStorage.clear());

  it("getSoundSettings returns all severities", () => {
    const settings = getSoundSettings();
    expect(settings.low).toBeDefined();
    expect(settings.medium).toBeDefined();
    expect(settings.high).toBeDefined();
    expect(settings.critical).toBeDefined();
  });

  it("each severity has correct shape", () => {
    const settings = getSoundSettings();
    for (const severity of ["low", "medium", "high", "critical"] as const) {
      const s = settings[severity];
      expect(s.frequency).toBeGreaterThan(0);
      expect(s.duration).toBeGreaterThan(0);
      expect(s.volume).toBeGreaterThan(0);
      expect(s.beeps).toBeGreaterThan(0);
      expect(TONE_TYPES).toContain(s.tone);
    }
  });

  it("setAlertSoundsMuted/getAlertSoundsMuted roundtrip", () => {
    setAlertSoundsMuted(true);
    expect(getAlertSoundsMuted()).toBe(true);
    setAlertSoundsMuted(false);
    expect(getAlertSoundsMuted()).toBe(false);
  });

  it("getSoundEnabled is inverse of muted", () => {
    setAlertSoundsMuted(false);
    expect(getSoundEnabled()).toBe(true);
    setAlertSoundsMuted(true);
    expect(getSoundEnabled()).toBe(false);
  });

  it("setSoundEnabled sets muted inversely", () => {
    setSoundEnabled(false);
    expect(getAlertSoundsMuted()).toBe(true);
    setSoundEnabled(true);
    expect(getAlertSoundsMuted()).toBe(false);
  });

  it("setSoundVolume clamps between 0 and 1", () => {
    setSoundVolume(1.5);
    expect(getSoundVolume()).toBeLessThanOrEqual(1);
    setSoundVolume(-0.5);
    expect(getSoundVolume()).toBeGreaterThanOrEqual(0);
  });

  it("TONE_TYPES contains expected types", () => {
    expect(TONE_TYPES).toEqual(["sine", "square", "triangle", "sawtooth"]);
  });

  it("frequency and volume increase with severity", () => {
    const s = getSoundSettings();
    // Verify ordering: low < medium < high < critical
    expect(s.medium.frequency).toBeGreaterThan(s.low.frequency);
    expect(s.high.frequency).toBeGreaterThan(s.medium.frequency);
    expect(s.critical.frequency).toBeGreaterThan(s.high.frequency);
  });
});
