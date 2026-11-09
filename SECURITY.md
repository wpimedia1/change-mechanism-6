# Security policy

Report vulnerabilities privately at https://github.com/wpimedia1/change-mechanism-6/security/advisories/new.
Do not include credentials or personal information in public issues. The main branch is supported.

Scans run only after a user action in the browser. DNS questions are sent to
Cloudflare DNS-over-HTTPS; the optional HTTPS probe contacts the entered domain.
The application does not upload scans to its hosting Worker or store a scan history.
Hosting providers may maintain ordinary access logs. Do not enter secrets.

Only seven allowlisted public files are deployed. Environment files, source,
Git metadata and build tooling are never public assets. Inline application code
and factual JSON-LD use exact CSP hashes; inline event handlers are prohibited.
Inline styles remain permitted for the existing dynamic report colors and progress
bar. HTTPS connections are permitted by CSP because users choose the public
domain for the browser HTTPS check; this is not a server-side fetch proxy.

The score is a heuristic, not proof of security or a full standards audit.
DKIM selector discovery is limited; HTTPS probing does not inspect certificate
expiry, chains or cipher suites. Never enforce a DNS policy solely from this score.

CI scans staged files, tests routing and scanner behavior, runs CodeQL, and
checks an unprivileged read-only container. No deployment credentials are in CI.
Renew security.txt before 2027-11-01. Public noindex/robots rules are not authentication.
