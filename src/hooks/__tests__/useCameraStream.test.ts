import { describe, it, expect, vi } from 'vitest';
import * as globalStreamingModule from '@/hooks/useGlobalStreaming';

describe('useCameraStream', () => {
  it('exports useCameraStream function', () => {
    expect(globalStreamingModule.useCameraStream).toBeDefined();
  });

  it('exports useGlobalStreaming function', () => {
    expect(globalStreamingModule.useGlobalStreaming).toBeDefined();
  });

  it('exports GlobalStreamingProvider', () => {
    expect(globalStreamingModule.GlobalStreamingProvider).toBeDefined();
  });

  it('module exports are not null', () => {
    Object.values(globalStreamingModule).forEach(value => {
      expect(value).not.toBeNull();
    });
  });
});
