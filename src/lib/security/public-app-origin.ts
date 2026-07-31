export function getPublicAppOrigin(): string {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.NODE_ENV !== 'production') {
    return new URL(configuredUrl || 'http://localhost:3000').origin;
  }
  if (!configuredUrl) {
    throw new Error('NEXT_PUBLIC_APP_URL is required in production');
  }

  const url = new URL(configuredUrl);
  const hostname = url.hostname.toLowerCase();
  if (
    url.protocol !== 'https:'
    || (hostname !== 'uniher.com.br' && !hostname.endsWith('.uniher.com.br'))
  ) {
    throw new Error('Invalid production application origin');
  }
  return url.origin;
}
