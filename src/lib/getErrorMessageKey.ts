export function getErrorMessageKey(error: Error, defaultKey = 'common.error'): string {
  const msg = error.message ?? '';
  if (msg.includes('Authentication required') || msg.includes('AuthRequired')) {
    return 'errors.authExpired';
  }
  if (msg.includes('Rate limited') || msg.includes('RateLimited')) {
    return 'library.rateLimited';
  }
  return defaultKey;
}
