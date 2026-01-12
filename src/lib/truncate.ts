/**
 * Truncate utilities
 * @module lib/truncate
 */

export function truncate(str: string, maxLength: number, suffix = '...'): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - suffix.length) + suffix;
}

export function truncateMiddle(str: string, maxLength: number, separator = '...'): string {
  if (str.length <= maxLength) return str;
  const charsToShow = maxLength - separator.length;
  const frontChars = Math.ceil(charsToShow / 2);
  const backChars = Math.floor(charsToShow / 2);
  return str.slice(0, frontChars) + separator + str.slice(-backChars);
}

export function truncateWords(str: string, wordCount: number, suffix = '...'): string {
  const words = str.split(' ');
  if (words.length <= wordCount) return str;
  return words.slice(0, wordCount).join(' ') + suffix;
}

export default { truncate, truncateMiddle, truncateWords };
