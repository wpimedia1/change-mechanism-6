import { redirectTarget } from './routing.mjs';
export default {
  async fetch(request, env) {
    const url = new URL(request.url), redirect = redirectTarget(url);
    if (redirect) return new Response(null, { status: 308, headers: { Location: redirect, 'Strict-Transport-Security': 'max-age=31536000' } });
    // Explicit mapping is required when assets.html_handling is "none".
    const assetUrl = new URL(url);
    if (assetUrl.pathname === '/') assetUrl.pathname = '/index.html';
    const asset = await env.ASSETS.fetch(new Request(assetUrl, request));
    const status = url.pathname === '/404.html' ? 404 : asset.status;
    const response = new Response(asset.body, { status, headers: asset.headers });
    if (status === 404 || url.hostname !== 'dmarc-able.app') response.headers.set('X-Robots-Tag', 'noindex');
    response.headers.set('Strict-Transport-Security', 'max-age=31536000');
    if (response.headers.get('content-type')?.startsWith('text/html')) response.headers.set('Cache-Control', 'public, max-age=0, must-revalidate, no-transform');
    return response;
  }
};
