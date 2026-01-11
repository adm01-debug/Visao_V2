/**
 * Fullscreen utilities
 */

export function isSupported(): boolean {
  return document.fullscreenEnabled;
}

export function isFullscreen(): boolean {
  return !!document.fullscreenElement;
}

export async function enter(element?: HTMLElement): Promise<void> {
  const el = element || document.documentElement;
  await el.requestFullscreen();
}

export async function exit(): Promise<void> {
  await document.exitFullscreen();
}

export async function toggle(element?: HTMLElement): Promise<void> {
  if (isFullscreen()) {
    await exit();
  } else {
    await enter(element);
  }
}

export function onChange(callback: () => void): () => void {
  document.addEventListener("fullscreenchange", callback);
  return () => document.removeEventListener("fullscreenchange", callback);
}

export default { isSupported, isFullscreen, enter, exit, toggle, onChange };

