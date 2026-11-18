# DMARC-able — Domain Security Checker

Live site: **https://dmarc-able.app**. Check public DMARC, SPF, DKIM and MX
records and browser HTTPS reachability. The static homepage includes metadata,
methodology, factual structured data and crawlable navigation.

Repair Bench is a workspace for self-taught users checking their own domain or helping someone else. It separates the finding, public evidence, and the next conversation.

## What it checks

- **DMARC:** the directly published record and policy; not inherited policy or every tag.
- **SPF:** record presence, duplicate records, and permissive `all`; not the full lookup tree.
- **DKIM:** public keys at 15 common selectors. An inconclusive result does not mean DKIM is absent.
- **HTTPS:** browser reachability, not a certificate audit.
- **MX:** published receiving records, not proof of delivery.

No checks run on load. **Example report** uses clearly labelled sample data without DNS or HTTPS requests. **Check domain** queries Cloudflare DNS from the browser and optionally contacts the target site over HTTPS. Failed lookups remain inconclusive, not missing records.

## Notes you can make your own

**My domain** turns findings into personal next steps. **Helping someone** creates a short email or call outline with an optional recipient. Every draft is editable. Edits survive switching audience or format until a new scan, example report, or reload; recipient changes do not overwrite edited text. **Use suggested wording** explicitly resets the current draft. Copy uses the browser clipboard, with a manual-selection fallback. Drafts are composed locally, with no AI service or API key.

The checker runs from one HTML file. Production hosting uses a small Cloudflare routing Worker for canonical redirects and security headers; it does not perform scans or receive results.

## Editing the interface

Edit `design-source/repair-bench.html`, `.css`, and `.js`, then run `npm run compose` to regenerate the committed `index.html`. Run `npm test` and `npm run check` before release. Production builds consume the committed HTML and emit CSP hashes; restart a local server after rebuilding so headers match the new scripts.

Icons are from Phosphor Icons 2.1.1 (MIT); the original SVGs and license are in `design-source/`. No icon CDN or runtime dependency is needed. The local `qa/` screenshots are review artifacts and are excluded from the public build and Git.

## Download

Click `index.html` above → **Download raw file** → open it.

## Develop and release

Use Node 22 or later: `npm ci --ignore-scripts`, `npm run build`, then `npm start`.
Open http://127.0.0.1:4174. Run `npm test`, `npm run check`,
`npm run security:check` and `npm run check:cloudflare` before release.
Cloudflare builds main with `npx wrangler deploy`; only the public build allowlist
is uploaded. Pull requests run tests on Node 22/24, container checks and CodeQL.

See [SEO.md](SEO.md) for redirects, crawl controls and owner-only Search Console
instructions, and [SECURITY.md](SECURITY.md) for private vulnerability reporting.
No analytics, advertising or API keys are added.
