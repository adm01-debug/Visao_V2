/**
 * Capitalize utilities
 * @module lib/capitalize
 */

export function capitalize(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export function capitalizeWords(str: string): string {
  return str.split(' ').map(capitalize).join(' ');
}

export function capitalizeFirst(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function toTitleCase(str: string): string {
  const minorWords = ['a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'in', 'nor', 'of', 'on', 'or', 'so', 'the', 'to', 'up', 'yet'];
  return str.split(' ').map((word, i) => {
    if (i === 0) return capitalize(word);
    return minorWords.includes(word.toLowerCase()) ? word.toLowerCase() : capitalize(word);
  }).join(' ');
}

export default { capitalize, capitalizeWords, capitalizeFirst, toTitleCase };
