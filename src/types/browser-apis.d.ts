// Browser APIs Type Declarations
// APIs that don't have TypeScript definitions

// Performance Memory API
interface PerformanceMemory {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

interface Performance {
  memory?: PerformanceMemory;
}

// Background Sync API
interface SyncManager {
  register(tag: string): Promise<void>;
  getTags(): Promise<string[]>;
}

interface PeriodicSyncManager {
  register(tag: string, options?: { minInterval: number }): Promise<void>;
  unregister(tag: string): Promise<void>;
  getTags(): Promise<string[]>;
}

interface ServiceWorkerRegistration {
  sync?: SyncManager;
  periodicSync?: PeriodicSyncManager;
}

// Request Idle Callback
interface IdleDeadline {
  didTimeout: boolean;
  timeRemaining(): number;
}

interface IdleRequestOptions {
  timeout?: number;
}

interface Window {
  requestIdleCallback?(
    callback: (deadline: IdleDeadline) => void,
    options?: IdleRequestOptions
  ): number;
  cancelIdleCallback?(handle: number): void;
  gc?(): void;
}

// Network Information API
interface NetworkInformation extends EventTarget {
  type: 'bluetooth' | 'cellular' | 'ethernet' | 'none' | 'wifi' | 'wimax' | 'other' | 'unknown';
  effectiveType: 'slow-2g' | '2g' | '3g' | '4g';
  downlink: number;
  downlinkMax?: number;
  rtt: number;
  saveData: boolean;
  onchange: ((this: NetworkInformation, ev: Event) => void) | null;
}

interface Navigator {
  connection?: NetworkInformation;
  mozConnection?: NetworkInformation;
  webkitConnection?: NetworkInformation;
}

// Device Motion API with permission
interface DeviceMotionEventPermissionState {
  state: 'granted' | 'denied' | 'prompt';
}

interface DeviceMotionEventStatic {
  requestPermission?(): Promise<'granted' | 'denied'>;
}

// Web Audio Context
interface Window {
  webkitAudioContext?: typeof AudioContext;
}

// Fullscreen API vendor prefixes
interface HTMLElement {
  webkitRequestFullscreen?(): Promise<void>;
  mozRequestFullScreen?(): Promise<void>;
  msRequestFullscreen?(): Promise<void>;
}

interface Document {
  webkitExitFullscreen?(): Promise<void>;
  mozCancelFullScreen?(): Promise<void>;
  msExitFullscreen?(): Promise<void>;
  webkitFullscreenElement?: Element | null;
  mozFullScreenElement?: Element | null;
  msFullscreenElement?: Element | null;
}

// Preload link types
interface HTMLLinkElement {
  rel: 'preload' | 'prefetch' | 'preconnect' | 'dns-prefetch' | 'stylesheet' | string;
  as?: 'script' | 'style' | 'image' | 'font' | 'fetch' | 'document' | 'audio' | 'video';
}

export {};
