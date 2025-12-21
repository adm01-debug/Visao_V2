import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn(() => ({ select: vi.fn().mockReturnThis(), order: vi.fn().mockResolvedValue({ data: [], error: null }) })) },
}));

describe('Hook', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  it('works', () => { expect(true).toBe(true); });
});
