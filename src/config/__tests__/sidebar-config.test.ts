import { describe, it, expect } from 'vitest';
import { sidebarConfig, getSidebarItems, filterByRole } from '../sidebar-config';

describe('sidebar-config', () => {
  it('exports sidebar configuration', () => {
    expect(sidebarConfig).toBeDefined();
    expect(Array.isArray(sidebarConfig)).toBe(true);
  });

  it('has required properties for each item', () => {
    sidebarConfig.forEach(item => {
      expect(item).toHaveProperty('id');
      expect(item).toHaveProperty('label');
      expect(item).toHaveProperty('path');
    });
  });

  it('getSidebarItems returns items', () => {
    const items = getSidebarItems();
    expect(items.length).toBeGreaterThan(0);
  });

  it('filterByRole filters items by user role', () => {
    const adminItems = filterByRole('admin');
    const userItems = filterByRole('user');
    expect(adminItems.length).toBeGreaterThanOrEqual(userItems.length);
  });
});
