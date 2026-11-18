# Repair Bench design QA

final result: passed

Reviewed 2026-11-18. Local implementation on `codex/repair-bench-redesign`; production has not been changed.

## Reference and captures

- Selected visual: option 2, `C:/Users/crudo/.codex/generated_images/01a1beb3-9055-72d1-96c5-4fbdfc720804/exec-63b67eba-832e-4cac-834d-5a28b01728fe.png` (1487 × 1058).
- Preview: http://127.0.0.1:4177/ using the existing Node server and real CSP.
- Desktop comparison state: Example report, Helping someone, Short email, Alex recipient. Browser viewport 1487 × 1058. Screenshot content excludes the browser scrollbar (1472 pixels wide); reference was scaled proportionally to that content width in comparisons. Full capture: `qa/desktop-full.png`.
- Combined full comparison: `qa/comparison.jpg`; focused comparisons: `qa/finding-comparison.jpg`, `qa/draft-comparison.jpg`. All three were opened and visually inspected with the reference and implementation together.
- Mobile: 390 × 844, `qa/mobile-top.png`, `qa/mobile-draft.png`. Full-page mobile capture was unavailable; separate visible top and composer captures were inspected instead.
- Tablet: 820 × 1180, `qa/tablet-final.png` (opened after the fix).
- Capture paths are relative to this checkout; `qa/` is local and intentionally excluded from Git/public assets.

## Fidelity review

1. **Fonts and typography:** DM Sans with real 400–800 weights. Increased the main heading to 44px and finding heading to 32px after comparison. Clear heading/body hierarchy, readable line spacing, no clipped text in final tablet/mobile views. The generated reference's heavier raster lettering differs slightly from the real font (P3).
2. **Spacing and layout:** navy masthead, audience/domain toolbar, numbered left rail, three-part yellow finding, evidence strip, check rows, and separated right composer match the selected structure. Moved per-check evidence into its explanation column to reduce excessive row height. Fixed the tablet rail from 112px to 136px after “Understand” clipped. Mobile stacks the explanation and composer and moves steps to a horizontal rail. No document horizontal overflow at tested widths.
3. **Colors and surfaces:** navy, cobalt, soft yellow, pale blue evidence, green positive states, restrained borders and corners. Unknown results deliberately use a neutral status rather than presenting uncertainty as failure. Visible focus rings and textual status labels accompany color.
4. **Images and assets:** no raster imagery is called for in the workspace. Phosphor regular icons replace the mock's standard symbols; original licensed SVG assets are embedded as data images with fixed dimensions. The shield is a library icon rather than an exact recreation of the generated logo (P3). No decorative div art or custom SVG illustration was added.
5. **Icons, content, and interaction:** consistent library stroke and sizing throughout. Draft wording is shorter and audience-specific. The example is explicitly labelled in the report and copied draft; this adds some height versus the unlabeled mock. Evidence disclosures, safety context, reset wording, and methodology also add functional content beyond the image. Lower check rows may require scrolling at the reference height; there is no content loss.

## Browser behavior verified

- Initial empty state with disabled draft/copy controls.
- Example report renders without a live scan (also asserted with zero fetch calls in tests).
- Helping someone / My domain and email / call-note modes.
- Recipient personalization; manually edited email preserved across format switches.
- Explicit reset to suggested wording; clipboard success feedback.
- Real `dmarc-able.app` scan submitted with Enter: DMARC/SPF/MX missing, DKIM inconclusive, HTTPS reached; these are observations from this check, not a permanent assessment.
- Invalid `localhost` input shows a helpful error.
- Check selection, evidence disclosure, and rail navigation; Share focuses the draft.
- Mobile personal-note composer, keyboard focus indicators, labelled controls, one H1, reduced-motion styling.
- Browser error logs empty at final review. Script hashes remain enforced; no unrestricted inline script permission was added.

## Automated validation and release boundary

- `npm test`: 9 tests passed. Includes initial HTML/schema/CSP, private-file 404s, robots/sitemap/security.txt, canonical redirects, Worker asset mapping, no-fetch startup/example, draft preservation, lookup failures, DKIM uncertainty, DMARC/SPF cases, validation, and escaping.
- `npm run check`: passed (including interface JS and composition helper).
- `npm run check:cloudflare`: dry run passed, no deployment.
- `npm run security:check`: passed on 44 staged/tracked files; no recognized credentials or secret files. `git diff --cached --check`: clean.
- Local Docker engine is not running, so container validation was not performed. Remote CI/CodeQL and production verification belong to the eventual protected-PR release and are not claimed complete here.
- Existing SEO metadata, crawl files, redirect routing, public allowlist, and hashed CSP are preserved. Build still publishes exactly the existing seven public assets.

No remaining P0/P1/P2 design findings. Remaining P3s are the minor logo/font differences and the extra vertical space required by explicit sample labels and evidence controls. The working local preview is the handoff; nothing has been pushed or published.
