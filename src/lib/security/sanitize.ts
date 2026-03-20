import DOMPurify from 'isomorphic-dompurify';

/** Sanitiza HTML de input do usuario para prevenir XSS */
export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });
}

/** Sanitiza um objeto, aplicando sanitize em todos os campos string */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const sanitized = { ...obj };
  for (const key of Object.keys(sanitized)) {
    const value = sanitized[key];
    if (typeof value === 'string') {
      (sanitized as Record<string, unknown>)[key] = sanitizeHtml(value);
    }
  }
  return sanitized;
}
