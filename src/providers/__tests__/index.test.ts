import { describe, it, expect } from 'vitest';
import * as providers from '@/providers';

describe('providers index', () => {
  it('exports all providers', () => {
    expect(providers).toBeDefined();
  });

  it('exports AppProviders', () => {
    expect(providers.AppProviders).toBeDefined();
  });

  it('exports ModalProvider', () => {
    expect(providers.ModalProvider).toBeDefined();
  });

  it('exports ToastProvider', () => {
    expect(providers.ToastProvider).toBeDefined();
  });
});
