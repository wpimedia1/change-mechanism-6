# DMARC-able — Domain Security Checker

Live site: **https://dmarc-able.app**. Check public DMARC, SPF, DKIM and MX
records and browser HTTPS reachability. The static homepage includes metadata,
methodology, factual structured data and crawlable navigation.

A domain security auditor for finding gaps in small business email and web configuration — and turning those gaps into sales conversations.

Download `index.html`. Open it in any browser. Type a domain. That's it.

No install. No account. No API key. No server. One file.

The downloaded checker still runs locally from one HTML file. Production hosting
uses a small Cloudflare routing Worker for canonical redirects and security headers;
the Worker does not perform domain scans or receive scan results.

---

## What it checks

- **DMARC** — is it there, what's the policy, is it actually enforced
- **SPF** — present, correct, not catastrophically misconfigured
- **DKIM** — probes 15 common selectors to find active keys
- **SSL / port 443** — is HTTPS actually working
- **MX records** — can the domain receive email, how many exchangers, which provider

## What it does with the results

Every scan ends with a ready-to-use sales pitch written to the specific problem found. Missing DMARC is a different conversation than weak SPF — the tool knows the difference and gives you the right angle.

## SSL report notes: what `!` means

The **`!` beside the certificate-details line is an informational notice**, not an error or a vulnerability warning. For example:

```text
! Certificate details (expiry, chain, ciphers) require CLI: openssl s_client -connect example.com:443 -showcerts
```

A passing SSL check means the browser HTTPS probe succeeded; the report marks port 443 as reachable and the TLS handshake as completed. The scanner does not retrieve or deeply inspect the certificate's expiration date, intermediate certificate chain, or supported cipher suites. This notice identifies that scan limitation and does not change the SSL result from PASS.

To inspect the connection manually, run this in a terminal with OpenSSL installed, replacing `example.com` with the scanned domain:

```sh
openssl s_client -connect example.com:443 -showcerts
```

For the domain `worldpostinc.com`, use:

```sh
openssl s_client -connect worldpostinc.com:443 -showcerts
```

OpenSSL shows the certificates sent by the server and the connection's negotiated TLS protocol and cipher. The `-showcerts` output is not a verified certificate chain, and one connection does not enumerate all supported ciphers. To display a certificate's validity dates explicitly, save its PEM block to `certificate.pem` and run `openssl x509 -in certificate.pem -noout -dates`; `notAfter` is the expiration date. See the [OpenSSL s_client documentation](https://docs.openssl.org/3.0/man1/openssl-s_client/).

This meaning applies specifically to the certificate-details notice. Other `!` entries can flag configuration warnings; read their message and the card's status.

---

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
