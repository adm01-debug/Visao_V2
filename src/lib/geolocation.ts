/**
 * Geolocation utilities
 */

export interface Position {
  latitude: number;
  longitude: number;
  accuracy: number;
}

export function isSupported(): boolean {
  return "geolocation" in navigator;
}

export function getCurrentPosition(): Promise<Position> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
      }),
      reject
    );
  });
}

export function watchPosition(callback: (pos: Position) => void): number {
  return navigator.geolocation.watchPosition((pos) => {
    callback({
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
    });
  });
}

export function clearWatch(watchId: number): void {
  navigator.geolocation.clearWatch(watchId);
}

export default { isSupported, getCurrentPosition, watchPosition, clearWatch };

