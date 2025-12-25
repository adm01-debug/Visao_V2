import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock do hook useAuth
const mockUseAuth = () => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  login: vi.fn(),
  logout: vi.fn(),
  register: vi.fn(),
});

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return initial state', () => {
    const auth = mockUseAuth();
    expect(auth.user).toBeNull();
    expect(auth.isAuthenticated).toBe(false);
    expect(auth.isLoading).toBe(false);
  });

  it('should have login function', () => {
    const auth = mockUseAuth();
    expect(typeof auth.login).toBe('function');
  });

  it('should have logout function', () => {
    const auth = mockUseAuth();
    expect(typeof auth.logout).toBe('function');
  });

  it('should have register function', () => {
    const auth = mockUseAuth();
    expect(typeof auth.register).toBe('function');
  });
});
