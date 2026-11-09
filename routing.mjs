export const ORIGIN = 'https://dmarc-able.app';
export function redirectTarget(url, { enforceHttps = true } = {}) {
  const canonical = url.hostname === 'dmarc-able.app';
  const alias = url.hostname.endsWith('.dmarc-able.app') || url.hostname === 'dmarcable.wpimedia.workers.dev';
  const path = ['/index', '/index.html'].includes(url.pathname) ? '/' : url.pathname;
  if (alias || (canonical && ((enforceHttps && url.protocol !== 'https:') || path !== url.pathname))) return ORIGIN + path + url.search;
  if (path !== url.pathname) return path + url.search;
  return null;
}
