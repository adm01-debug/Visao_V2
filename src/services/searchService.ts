interface SearchOptions { caseSensitive?: boolean; fuzzy?: boolean; fields?: string[]; limit?: number; }

class SearchService {
  search<T extends Record<string, any>>(items: T[], query: string, options: SearchOptions = {}): T[] {
    const { caseSensitive = false, fuzzy = false, fields, limit } = options;
    if (!query.trim()) return items;

    const normalizedQuery = caseSensitive ? query : query.toLowerCase();

    const results = items.filter(item => {
      const searchFields = fields || Object.keys(item);
      return searchFields.some(field => {
        const value = String(item[field] ?? '');
        const normalizedValue = caseSensitive ? value : value.toLowerCase();
        return fuzzy ? this.fuzzyMatch(normalizedValue, normalizedQuery) : normalizedValue.includes(normalizedQuery);
      });
    });

    return limit ? results.slice(0, limit) : results;
  }

  private fuzzyMatch(text: string, pattern: string): boolean {
    let patternIdx = 0;
    for (let i = 0; i < text.length && patternIdx < pattern.length; i++) {
      if (text[i] === pattern[patternIdx]) patternIdx++;
    }
    return patternIdx === pattern.length;
  }

  highlight(text: string, query: string, tag = 'mark'): string {
    if (!query) return text;
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, `<${tag}>$1</${tag}>`);
  }

  tokenize(text: string): string[] {
    return text.toLowerCase().split(/\W+/).filter(Boolean);
  }
}

export const searchService = new SearchService();
export default searchService;
