import { describe, it, expect } from 'vitest';
import { pluralize, pluralizeWithCount, pluralizeItem } from '../pluralize';

describe('pluralize', () => {
  it('should return singular for 1', () => {
    expect(pluralize(1, 'item', 'itens')).toBe('item');
  });

  it('should return plural for other numbers', () => {
    expect(pluralize(0, 'item', 'itens')).toBe('itens');
    expect(pluralize(2, 'item', 'itens')).toBe('itens');
    expect(pluralize(100, 'item', 'itens')).toBe('itens');
  });

  it('should auto-pluralize with s', () => {
    expect(pluralize(2, 'arquivo')).toBe('arquivos');
  });
});

describe('pluralizeWithCount', () => {
  it('should include count', () => {
    expect(pluralizeWithCount(1, 'item', 'itens')).toBe('1 item');
    expect(pluralizeWithCount(5, 'item', 'itens')).toBe('5 itens');
  });
});

describe('pluralizeItem', () => {
  it('should pluralize items correctly', () => {
    expect(pluralizeItem(1)).toBe('1 item');
    expect(pluralizeItem(3)).toBe('3 itens');
  });
});
