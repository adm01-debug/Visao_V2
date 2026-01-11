import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getMediaDevices, requestMediaStream, stopMediaStream, captureImage } from '../media';

describe('media utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getMediaDevices', () => {
    it('returns media devices', async () => {
      const mockDevices = [{ kind: 'videoinput', deviceId: '1' }];
      Object.assign(navigator, {
        mediaDevices: { enumerateDevices: vi.fn().mockResolvedValue(mockDevices) }
      });
      const devices = await getMediaDevices();
      expect(devices).toEqual(mockDevices);
    });
  });

  describe('requestMediaStream', () => {
    it('requests media stream', async () => {
      const mockStream = { getTracks: () => [] };
      Object.assign(navigator, {
        mediaDevices: { getUserMedia: vi.fn().mockResolvedValue(mockStream) }
      });
      const stream = await requestMediaStream({ video: true });
      expect(stream).toBe(mockStream);
    });
  });

  describe('stopMediaStream', () => {
    it('stops all tracks', () => {
      const mockTrack = { stop: vi.fn() };
      const mockStream = { getTracks: () => [mockTrack] };
      stopMediaStream(mockStream as any);
      expect(mockTrack.stop).toHaveBeenCalled();
    });
  });
});
