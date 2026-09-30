/**
 * Resolves relative uploaded image paths (e.g. '/uploads/projects/hero/xyz.jpg')
 * to full accessible URLs based on environment configuration.
 */
export function getImageUrl(url?: string | null): string {
  if (!url) return '';
  if (
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('data:') ||
    url.startsWith('blob:')
  ) {
    return url;
  }

  const apiBase = import.meta.env.VITE_API_BASE_URL || '/api';
  // Strip '/api' from end of apiBase to get backend host
  const backendHost = apiBase.replace(/\/api\/?$/, '');

  const cleanPath = url.startsWith('/') ? url : `/${url}`;
  return `${backendHost}${cleanPath}`;
}
