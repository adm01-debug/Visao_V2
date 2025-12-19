// Alert notification sounds using Web Audio API

export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';
export type ToneType = 'sine' | 'square' | 'triangle' | 'sawtooth';

export const TONE_TYPES: ToneType[] = ['sine', 'square', 'triangle', 'sawtooth'];

export interface SoundConfig {
  frequency: number;
  duration: number;
  volume: number;
  beeps: number;
  interval: number;
  tone: ToneType;
}

export type SoundSettings = Record<AlertSeverity, SoundConfig>;

const DEFAULT_SETTINGS: SoundSettings = {
  low: {
    frequency: 440,
    duration: 150,
    volume: 0.2,
    beeps: 1,
    interval: 0,
    tone: 'sine',
  },
  medium: {
    frequency: 520,
    duration: 200,
    volume: 0.3,
    beeps: 2,
    interval: 150,
    tone: 'sine',
  },
  high: {
    frequency: 660,
    duration: 250,
    volume: 0.5,
    beeps: 3,
    interval: 200,
    tone: 'triangle',
  },
  critical: {
    frequency: 880,
    duration: 300,
    volume: 0.7,
    beeps: 4,
    interval: 250,
    tone: 'square',
  },
};

let audioContext: AudioContext | null = null;
let isMuted = false;
let soundSettings: SoundSettings = { ...DEFAULT_SETTINGS };

// Load settings from localStorage
function loadSettings(): void {
  try {
    const saved = localStorage.getItem('alert-sound-settings');
    if (saved) {
      soundSettings = { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    }
  } catch {
    soundSettings = { ...DEFAULT_SETTINGS };
  }
}

// Initialize on module load
loadSettings();

export function getSoundSettings(): SoundSettings {
  return { ...soundSettings };
}

export function updateSoundSettings(settings: SoundSettings): void {
  soundSettings = { ...settings };
  try {
    localStorage.setItem('alert-sound-settings', JSON.stringify(settings));
  } catch {
    // Ignore localStorage errors
  }
}

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
}

function playBeep(frequency: number, duration: number, volume: number, tone: ToneType): Promise<void> {
  return new Promise((resolve) => {
    const ctx = getAudioContext();
    
    // Resume context if suspended (browser autoplay policy)
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = tone;

    // Envelope for smooth sound
    const now = ctx.currentTime;
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(volume, now + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration / 1000);

    oscillator.start(now);
    oscillator.stop(now + duration / 1000);

    oscillator.onended = () => resolve();
  });
}

async function playAlertPattern(config: SoundConfig): Promise<void> {
  for (let i = 0; i < config.beeps; i++) {
    await playBeep(config.frequency, config.duration, config.volume, config.tone);
    if (i < config.beeps - 1 && config.interval > 0) {
      await new Promise(r => setTimeout(r, config.interval));
    }
  }
}

export async function playAlertSound(severity: AlertSeverity, forcePlay = false): Promise<void> {
  if (isMuted && !forcePlay) return;
  
  const config = soundSettings[severity];
  if (!config) return;

  try {
    await playAlertPattern(config);
  } catch (error) {
    console.warn('Failed to play alert sound:', error);
  }
}

export function setAlertSoundsMuted(muted: boolean): void {
  isMuted = muted;
  
  // Store preference
  try {
    localStorage.setItem('alert-sounds-muted', String(muted));
  } catch {
    // Ignore localStorage errors
  }
}

export function getAlertSoundsMuted(): boolean {
  try {
    return localStorage.getItem('alert-sounds-muted') === 'true';
  } catch {
    return false;
  }
}

// Initialize muted state from localStorage
isMuted = getAlertSoundsMuted();

// Critical alert with more urgent pattern
export async function playCriticalAlertSound(): Promise<void> {
  if (isMuted) return;

  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    const config = soundSettings.critical;
    
    // Play urgent siren-like pattern
    for (let i = 0; i < 3; i++) {
      await playBeep(config.frequency, 200, config.volume * 0.85, config.tone);
      await new Promise(r => setTimeout(r, 100));
      await playBeep(config.frequency * 1.25, 200, config.volume, config.tone);
      await new Promise(r => setTimeout(r, 150));
    }
  } catch (error) {
    console.warn('Failed to play critical alert sound:', error);
  }
}
