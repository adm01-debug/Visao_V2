export const groupBy = <T>(arr: T[], key: keyof T): Record<string, T[]> => 
  arr.reduce((acc, item) => {
    const k = String(item[key]);
    (acc[k] = acc[k] || []).push(item);
    return acc;
  }, {} as Record<string, T[]>);

export const sortBy = <T>(arr: T[], key: keyof T, order: 'asc' | 'desc' = 'asc'): T[] =>
  [...arr].sort((a, b) => {
    const aVal = a[key], bVal = b[key];
    const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
    return order === 'asc' ? cmp : -cmp;
  });

export const unique = <T>(arr: T[], key?: keyof T): T[] => 
  key ? arr.filter((item, i, self) => self.findIndex(t => t[key] === item[key]) === i) : [...new Set(arr)];

export const chunk = <T>(arr: T[], size: number): T[][] =>
  Array.from({ length: Math.ceil(arr.length / size) }, (_, i) => arr.slice(i * size, i * size + size));
