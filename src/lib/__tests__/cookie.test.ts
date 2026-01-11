import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getCookie, setCookie, deleteCookie, getAllCookies } from '../cookie';

describe('cookie utilities', () => {
  beforeEach(() => {
    Object.defineProperty(document, 'cookie', {
      writable: true,
      value: '',
    });
  });

  describe('setCookie', () => {
    it('sets cookie', () => {
      setCookie('test', 'value');
      expect(document.cookie).toContain('test=value');
    });

    it('sets cookie with options', () => {
      setCookie('test', 'value', { maxAge: 3600, path: '/' });
      expect(document.cookie).toContain('test=value');
    });
  });

  describe('getCookie', () => {
    it('gets cookie value', () => {
      document.cookie = 'test=value';
      expect(getCookie('test')).toBe('value');
    });

    it('returns undefined for missing cookie', () => {
      expect(getCookie('missing')).toBeUndefined();
    });
  });

  describe('deleteCookie', () => {
    it('deletes cookie', () => {
      document.cookie = 'test=value';
      deleteCookie('test');
      expect(getCookie('test')).toBeUndefined();
    });
  });
});
