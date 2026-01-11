import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getCurrentPosition, watchPosition, clearWatch, calculateDistance } from '../geolocation';

describe('geolocation utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getCurrentPosition', () => {
    it('gets current position', async () => {
      const mockPosition = { coords: { latitude: 0, longitude: 0 } };
      Object.assign(navigator, {
        geolocation: {
          getCurrentPosition: vi.fn((success) => success(mockPosition))
        }
      });
      const position = await getCurrentPosition();
      expect(position.coords).toBeDefined();
    });
  });

  describe('watchPosition', () => {
    it('watches position changes', () => {
      const callback = vi.fn();
      Object.assign(navigator, {
        geolocation: {
          watchPosition: vi.fn().mockReturnValue(1)
        }
      });
      const watchId = watchPosition(callback);
      expect(watchId).toBe(1);
    });
  });

  describe('clearWatch', () => {
    it('clears watch', () => {
      const clearMock = vi.fn();
      Object.assign(navigator, {
        geolocation: { clearWatch: clearMock }
      });
      clearWatch(1);
      expect(clearMock).toHaveBeenCalledWith(1);
    });
  });

  describe('calculateDistance', () => {
    it('calculates distance between coordinates', () => {
      const p1 = { latitude: 0, longitude: 0 };
      const p2 = { latitude: 0, longitude: 1 };
      const distance = calculateDistance(p1, p2);
      expect(distance).toBeGreaterThan(0);
    });
  });
});
