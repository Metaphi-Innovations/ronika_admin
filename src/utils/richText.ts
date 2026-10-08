/**
 * Utility functions for Rich Text handling, sanitization, and word count calculation.
 */

export const MAX_HERO_QUOTE_CHARS = 80;
export const MAX_CLIENT_BIO_CHARS = 250;
export const MAX_SERVICE_DESC_CHARS = 250;
export const MAX_ABOUT_HEADING_CHARS = 50;
export const MAX_ABOUT_BIO_CHARS = 700;
export const MAX_GALLERY_INTRO_CHARS = 80;

// Deprecated word constants (kept for backward compatibility)
export const MAX_HERO_QUOTE_WORDS = 20;
export const MAX_CLIENT_BIO_WORDS = 70;

/**
 * Strips HTML tags and converts HTML entity codes into plain text for accurate character and word count.
 */
export function stripHtmlToText(html?: string): string {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n')
    .replace(/<[^>]*>/g, '') // Strip remaining tags without adding extra spaces
    .replace(/&nbsp;|&#160;|&ensp;|&emsp;|&thinsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/^[\n\r]+/, '') // Remove leading newlines (ghost chars from empty editors)
    .replace(/[\n\r]+$/, ''); // Remove trailing newlines (ghost chars) but keep trailing spaces
}

/**
 * Calculates readable character count from raw text or rich text HTML string.
 * Strips HTML tags and entities to accurately count only visible characters.
 */
export function countReadableChars(content?: string): number {
  if (!content) return 0;
  // Do not count newlines/enters as characters, only spaces and visible letters
  return stripHtmlToText(content).replace(/[\n\r]/g, '').length;
}

/**
 * Calculates readable word count from raw text or rich text HTML string.
 * Ignores HTML tags and attributes.
 */
export function countReadableWords(content?: string): number {
  if (!content) return 0;
  const plainText = stripHtmlToText(content);
  if (!plainText) return 0;
  return plainText.split(/\s+/).filter(Boolean).length;
}

/**
 * Sanitizes rich text HTML to allow ONLY explicit formatting tags and safe attributes.
 * Prevents XSS, script tags, javascript: URLs, iframe embeds, and inline style color/font injections.
 */
export function sanitizeRichText(html?: string): string {
  if (!html) return '';

  // 1. Remove dangerous blocks (<script>, <style>, <iframe>, <object>, <embed>)
  let clean = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '');

  // 2. Remove inline event listeners (onclick=, onerror=, etc.)
  clean = clean.replace(/\s*on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');

  // 3. Prevent javascript: URLs
  clean = clean.replace(/href\s*=\s*["']?\s*javascript:[^"'>\s]*/gi, 'href="#"');

  // 4. Normalize any heading tags to paragraphs to avoid large line gaps
  clean = clean.replace(/<\/?h[1-6]\b[^>]*>/gi, (tag) => (tag.startsWith('</') ? '</p>' : '<p>'));

  // 5. Filter allowed tags and attributes
  const allowedTags = [
    'p', 'br', 'b', 'strong', 'i', 'em', 'u', 's', 'strike', 'del',
    'ol', 'ul', 'li', 'a', 'div', 'span'
  ];

  clean = clean.replace(/<\/?([a-z0-9]+)\b[^>]*>/gi, (match, tagName) => {
    const lower = tagName.toLowerCase();
    if (!allowedTags.includes(lower)) {
      return ''; // Strip non-allowed tag
    }

    // Closing tag
    if (match.startsWith('</')) {
      return `</${lower}>`;
    }

    // Anchor tags: preserve safe href and enforce target="_blank"
    if (lower === 'a') {
      const hrefMatch = match.match(/href\s*=\s*["']([^"']*)["']/i);
      const href = hrefMatch ? hrefMatch[1] : '#';
      if (href.toLowerCase().startsWith('javascript:')) {
        return '<a>';
      }
      return `<a href="${href}" target="_blank" rel="noopener noreferrer">`;
    }

    // Check for allowed style attribute (text-align only)
    const alignMatch = match.match(/style\s*=\s*["']([^"']*text-align\s*:\s*(left|center|right|justify)[^"']*)["']/i);
    if (alignMatch) {
      const sub = alignMatch[1].match(/text-align\s*:\s*(left|center|right|justify)/i);
      const textAlign = sub ? sub[1].toLowerCase() : '';
      if (textAlign) {
        return `<${lower} style="text-align: ${textAlign};">`;
      }
    }

    return `<${lower}>`;
  });

  // 6. Clean up trailing empty paragraphs and breaks to prevent lingering vertical space on next load
  clean = clean.replace(/(?:<p>(?:<br\s*\/?>|\s|&nbsp;)*<\/p>\s*)+$/gi, '');

  // 7. If the entire content is just empty paragraphs, return empty string
  if (clean.replace(/<[^>]*>/g, '').trim().length === 0) {
    return '';
  }

  return clean;
}
