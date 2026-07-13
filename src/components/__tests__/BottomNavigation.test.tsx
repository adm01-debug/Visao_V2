import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { BottomNavigation } from '../BottomNavigation';

vi.mock('@/hooks/useSidebarStatus', () => ({
  useSidebarStatus: () => ({
    unreadAlerts: 0,
    onlineCameras: 0,
    totalCameras: 0,
    activeRules: 0,
    totalRules: 0,
    registeredPersons: 0,
    activeZones: 0,
    isLoading: false,
  }),
}));

vi.mock('@/hooks/useUserRole', () => ({
  useUserRole: () => ({
    hasMinRole: () => true,
    role: 'admin',
    isAdmin: true,
    isLoading: false,
  }),
}));

vi.mock('@/lib/haptics', () => ({
  triggerHaptic: vi.fn(),
}));

describe('BottomNavigation', () => {
  it('renderiza sem erros com role admin', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <BottomNavigation />
      </MemoryRouter>,
    );
    expect(container.firstChild).toBeTruthy();
  });
});
