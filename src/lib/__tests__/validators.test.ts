import { describe, it, expect } from 'vitest';
import { isValidEmail, isValidUrl, isValidPlate, isValidRTSP } from '../validators';

describe('validators', () => {
  describe('isValidEmail', () => {
    it('validates correct email', () => {
      expect(isValidEmail('test@test.com')).toBe(true);
      expect(isValidEmail('user.name@domain.org')).toBe(true);
    });

    it('rejects invalid email', () => {
      expect(isValidEmail('invalid')).toBe(false);
      expect(isValidEmail('missing@')).toBe(false);
      expect(isValidEmail('@nodomain.com')).toBe(false);
    });
  });

  describe('isValidUrl', () => {
    it('validates correct URL', () => {
      expect(isValidUrl('https://example.com')).toBe(true);
      expect(isValidUrl('http://test.org/path')).toBe(true);
    });

    it('rejects invalid URL', () => {
      expect(isValidUrl('not-a-url')).toBe(false);
    });
  });

  describe('isValidPlate', () => {
    it('validates Brazilian plate format', () => {
      expect(isValidPlate('ABC1234')).toBe(true);
      expect(isValidPlate('ABC1D23')).toBe(true);
    });

    it('rejects invalid plate', () => {
      expect(isValidPlate('12345')).toBe(false);
    });
  });

  describe('isValidRTSP', () => {
    it('validates RTSP URL', () => {
      expect(isValidRTSP('rtsp://192.168.1.1:554/stream')).toBe(true);
    });

    it('rejects non-RTSP URL', () => {
      expect(isValidRTSP('http://example.com')).toBe(false);
    });
  });
});
