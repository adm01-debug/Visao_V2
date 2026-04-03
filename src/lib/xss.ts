import DOMPurify from 'dompurify';

export interface XSSConfig {
  allowedTags?: string[];
  allowedAttributes?: Record<string, string[]>;
  stripIgnoreTag?: boolean;
}

const defaultConfig: XSSConfig = {
  allowedTags: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li'],
  allowedAttributes: { a: ['href', 'title', 'target'] },
  stripIgnoreTag: true,
};

export const sanitize = (input: string, config: XSSConfig = defaultConfig): string => {
  const attrs: string[] = [];
  if (config.allowedAttributes) {
    for (const values of Object.values(config.allowedAttributes)) {
      attrs.push(...values);
    }
  }
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: config.allowedTags,
    ALLOWED_ATTR: attrs,
  });
};

export const stripAllTags = (input: string): string => {
  return DOMPurify.sanitize(input, { ALLOWED_TAGS: [] });
};

export const isClean = (input: string): boolean => {
  const sanitized = stripAllTags(input);
  return sanitized === input;
};

export const encodeForHTML = (input: string): string => {
  const div = document.createElement('div');
  div.textContent = input;
  return div.innerHTML;
};
