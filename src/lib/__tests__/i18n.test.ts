import { describe, it, expect } from 'vitest';
import { t, setLocale, getLocale, addTranslations, formatMessage } from '../i18n';

describe('i18n utilities', () => {
  describe('setLocale', () => {
    it('sets current locale', () => {
      setLocale('pt-BR');
      expect(getLocale()).toBe('pt-BR');
    });
  });

  describe('addTranslations', () => {
    it('adds translations for locale', () => {
      addTranslations('en', { hello: 'Hello' });
      setLocale('en');
      expect(t('hello')).toBe('Hello');
    });
  });

  describe('t', () => {
    it('translates key', () => {
      addTranslations('en', { greeting: 'Hello' });
      setLocale('en');
      expect(t('greeting')).toBe('Hello');
    });

    it('returns key for missing translation', () => {
      expect(t('missing.key')).toBe('missing.key');
    });
  });

  describe('formatMessage', () => {
    it('formats message with params', () => {
      addTranslations('en', { welcome: 'Hello, {name}!' });
      setLocale('en');
      expect(formatMessage('welcome', { name: 'John' })).toBe('Hello, John!');
    });
  });
});
