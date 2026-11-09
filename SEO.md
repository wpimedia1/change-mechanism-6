# SEO foundation and deployment

Canonical origin: https://dmarc-able.app. The only public indexable page is
the homepage. Scan targets and results stay in browser memory and never become
indexable URLs. Opening the page performs no DNS/HTTPS scan.

The initial HTML contains one H1, a description, self-canonical, social tags,
WebSite/WebPage JSON-LD, methodology and crawlable links. No invented ratings,
organization identity or search-result pages are marked up.

## Cloudflare

The existing dmarcable Worker uses the repository's main branch. Wrangler builds
only the seven approved public assets. A small Worker runs before asset delivery
to issue 308 redirects for HTTP, www, other subdomains and the original
dmarcable.wpimedia.workers.dev address. Paths and queries are preserved. The
index and index.html aliases normalize to /. Unknown URLs return a real branded
404 with noindex. Local development keeps its local origin.

Keep the apex Custom Domain attached. The wildcard DNS must be proxied and
the route *.dmarc-able.app/* must point to dmarcable. A wildcard preview domain
alone does not provide production wildcard redirects. Do not overwrite MX,
email-authentication TXT, or unrelated service records. Preview URLs and builds
from non-production branches should be disabled; any remaining version host
receives noindex. An existing production subdomain service should be excluded
from the redirect route before introducing such a service.

HTML uses no-transform to prevent automatic analytics injection. CSP permits
only the exact inline script hashes, the existing Google Fonts stylesheet/fonts,
same-origin images, and HTTPS browser connections needed by the scanner.
Inline styles support the existing results UI. DNS queries go to Cloudflare
only after user interaction. There are no analytics, ads, API keys or new limits.

Use npm ci --ignore-scripts, npm run build, npm test, npm run check,
npm run security:check and npm run check:cloudflare before merging.
npm start serves the same allowlisted build locally on 127.0.0.1:4174.
The Node deployment requires its hosting proxy to redirect HTTP to HTTPS.
The production Cloudflare Worker performs that redirect itself.

## Search Console owner steps

1. Add the Domain property dmarc-able.app in https://search.google.com/search-console.
2. Add Google's verification TXT record in Cloudflare DNS and verify ownership.
3. Submit https://dmarc-able.app/sitemap.xml.
4. Inspect https://dmarc-able.app/, use Test Live URL, and request indexing.

This release does not connect Search Console or add a verification token.
Indexing and rankings are not guaranteed. A new site may lack field Core Web
Vitals data; lab checks are a snapshot, not a field-performance guarantee.

Check the final robots.txt response after deployment, including any existing
Cloudflare additions. Do not change the account's crawler policy for SEO.
Renew security.txt before its 2027-11-01 expiry. Test keyboard and mobile
controls, scan results, DNS failures and CSP after script changes.
