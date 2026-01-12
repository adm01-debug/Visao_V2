/**
 * Query String utilities
 * @module lib/queryString
 */

export function parseQueryString(search: string): Record<string, string> {
  const params = new URLSearchParams(search);
  const result: Record<string, string> = {};
  params.forEach((value, key) => { result[key] = value; });
  return result;
}

export function buildQueryString(params: Record<string, string | number | boolean | undefined>): string {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, String(value));
    }
  });
  return searchParams.toString();
}

export function updateQueryString(
  currentSearch: string,
  updates: Record<string, string | number | boolean | undefined>
): string {
  const params = parseQueryString(currentSearch);
  Object.entries(updates).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      delete params[key];
    } else {
      params[key] = String(value);
    }
  });
  return buildQueryString(params);
}

export default { parseQueryString, buildQueryString, updateQueryString };
