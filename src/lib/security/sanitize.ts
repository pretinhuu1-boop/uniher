let DOMPurify: any;

// Carrega DOMPurify apenas no cliente
if (typeof window !== 'undefined') {
  const module = require('isomorphic-dompurify');
  DOMPurify = module.default || module;
}

/** Sanitiza HTML de input do usuario para prevenir XSS */
export function sanitizeHtml(dirty: string): string {
  // No servidor: remove HTML/scripts simples
  if (typeof window === 'undefined') {
    return dirty
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<[^>]*>/g, '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }

  // No cliente: usa DOMPurify
  if (DOMPurify) {
    return DOMPurify.sanitize(dirty, {
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: [],
    });
  }

  return dirty;
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
