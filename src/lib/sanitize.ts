import DOMPurify from "dompurify";

/**
 * Sanitize HTML content to prevent XSS attacks
 */
export const sanitizeHtml = (dirty: string): string => {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ["b", "i", "em", "strong", "a", "p", "br", "ul", "ol", "li", "span"],
    ALLOWED_ATTR: ["href", "target", "rel", "class"],
  });
};

/**
 * Sanitize with no HTML allowed (text only)
 */
export const sanitizeText = (dirty: string): string => {
  return DOMPurify.sanitize(dirty, { ALLOWED_TAGS: [] });
};

/**
 * Sanitize with custom config
 */
export const sanitizeWithConfig = (
  dirty: string,
  config: DOMPurify.Config
): string => {
  return DOMPurify.sanitize(dirty, config);
};

/**
 * Check if content contains potential XSS
 */
export const containsXSS = (content: string): boolean => {
  const cleaned = DOMPurify.sanitize(content);
  return cleaned !== content;
};

export default {
  sanitizeHtml,
  sanitizeText,
  sanitizeWithConfig,
  containsXSS,
};
