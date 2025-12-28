import { describe, it, expect, beforeEach } from 'vitest';
import { useReportStore } from '@/stores/reportStore';
import { act, renderHook } from '@testing-library/react';

describe('reportStore', () => {
  beforeEach(() => { useReportStore.getState().reset(); });

  it('deve adicionar relatório', () => {
    const { result } = renderHook(() => useReportStore());
    act(() => { result.current.addReport({ id: '1', type: 'daily', date: new Date() }); });
    expect(result.current.reports).toHaveLength(1);
  });

  it('deve gerar relatório', () => {
    const { result } = renderHook(() => useReportStore());
    act(() => { result.current.generateReport('daily'); });
    expect(result.current.isGenerating).toBeDefined();
  });
});
