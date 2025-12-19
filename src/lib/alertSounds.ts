// Alert notification sounds using Web Audio API

type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';

interface SoundConfig {
  frequency: number;
  duration: number;
  volume: number;
  beeps: number;
  interval: number;
}

const SOUND_CONFIGS: Record<AlertSeverity, SoundConfig> = {
  low: {
    frequency: 440,
    duration: 150,
    volume: 0.2,
    beeps: 1,
    interval: 0,
  },
  medium: {
    frequency: 520,
    duration: 200,
    volume: 0.3,
    beeps: 2,
    interval: 150,
  },
  high: {
    frequency: 660,
    duration: 250,
    volume: 0.5,
    beeps: 3,
    interval: 200,
  },
  critical: {
    frequency: 880,
    duration: 300,
    volume: 0.7,
    beeps: 4,
    interval: 250,
  },
};

let audioContext: AudioContext | null = null;
let isMuted = false;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
}

function playBeep(frequency: number, duration: number, volume: number): Promise<void> {
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
    oscillator.type = 'sine';

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
    await playBeep(config.frequency, config.duration, config.volume);
    if (i < config.beeps - 1 && config.interval > 0) {
      await new Promise(r => setTimeout(r, config.interval));
    }
  }
}

export async function playAlertSound(severity: AlertSeverity): Promise<void> {
  if (isMuted) return;
  
  const config = SOUND_CONFIGS[severity];
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

    // Play urgent siren-like pattern
    for (let i = 0; i < 3; i++) {
      await playBeep(880, 200, 0.6);
      await new Promise(r => setTimeout(r, 100));
      await playBeep(1100, 200, 0.7);
      await new Promise(r => setTimeout(r, 150));
    }
  } catch (error) {
    console.warn('Failed to play critical alert sound:', error);
  }
}
