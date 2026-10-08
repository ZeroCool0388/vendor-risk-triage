# Verification and acceptance notes

This file records observed checks separately from checks that require external access. The main implementation plan is in `IMPLEMENTATION_PLAN.md`.

## Automated checks

Verified on 8 October 2026: production build, strict types, lint with zero warnings, 20 unit/API tests and all five Chromium scenarios passed. The browser suite passed against the local production server, the hosted Vercel preview and the permanent production domain. GitHub Actions also passed the clean-install, lint, types, unit/API tests, build and browser suite. A separate fresh public clone installed, built and started with no `.env` file; its populated workspace returned HTTP 200. The exported report has three pages; text extraction verified the disclaimer on each page, and rendered pages were inspected. Production dependency audit: zero reported vulnerabilities. The development toolchain retains nine high advisories in the shadcn/ESLint dependency chain; no forced downgrade was applied.

- `npm run typecheck`: Next.js route types and strict TypeScript.
- `npm run lint`: ESLint, with zero warnings permitted.
- `npm run test`: 20 core/API tests covering weighted scoring, acceptance vs mitigation, overrides, Markdown/TXT/PDF parsing, input rejection, exact/normalized/conservative fuzzy citations, source tampering, schema validation, all seed fixtures, rules and provider routing.
- `npm run test:e2e`: five Chromium browser scenarios covering the complete Northwind workflow, all vendors, a PDF evidence jump, three upload formats, preserved navigation state, explicit demo fallback, exports, clipboard, override persistence, four viewport widths and dark mode.
- `npm run build`: production compilation and static assets.

The provider tests use controlled responses. They verify both provider adapters and the typed failure path without API spending, and do not prove real model calls.

## Browser flow under test

Landing workspace → Run triage → review 68/High → open MFA evidence → jump to highlighted source → change severity to Medium → score 64 → record a note → filter and sort → edit follow-up → copy email → download Markdown/PDF → reload and confirm saved decisions.

Additional flows exercise Apex's PDF citation, Sterling, a new fictional vendor, Markdown/TXT/PDF upload, vendor navigation, a provider error and explicit demo retry.

## Visual checks

The generated design reference is `docs/design/workspace-concept.png`; actual screenshots are in `docs/screenshots/`. The implementation preserves the reference's sidebar, document row, tabs, three assessment panels and findings table. Deliberate corrections use the brief's exact seven domains, real document word counts, truthful coverage labels, accessible severity text colors and accurate synthetic findings rather than the reference image's invented wording.

The built-in browser is used for direct inspection and citation navigation. The explicitly requested Playwright suite supplies repeatable checks and screenshots at 1440, 1024, 768 and 390 px. PDF text checks are paired with rendered-page inspection; the synthetic footer must appear on every page.

## Manual live-provider matrix

Run privately when a key is available; keep public deployment keys unset.

| Provider                  | Northwind | Apex    | Sterling | MD / TXT / PDF uploads |
| ------------------------- | --------- | ------- | -------- | ---------------------- |
| OpenAI with a real key    | Pending   | Pending | Pending  | Pending                |
| Anthropic with a real key | Pending   | Pending | Pending  | Pending                |

For each run confirm the Live badge, valid structured findings, quote verification, gap/unverified flags, overridden score and both report formats. No real keys were present during local implementation.

## Deployment

- Public source: https://github.com/ZeroCool0388/vendor-risk-triage
- Permanent demo: https://vendor-risk-triage-zerocool0388.vercel.app
- Project: https://vercel.com/zero-cool0388/vendor-risk-triage
- Vercel's claim flow transferred the verified deployment into Steve's ZeroCool0388 Hobby team. The project was renamed; the deployed source is commit `fa07d76`. No provider keys were supplied and the app displays Demo mode.
- Ready state, home page HTTP 200, all three seeded APIs and all five browser scenarios passed on the permanent domain after claiming. Source passages, all three vendor workflows, uploads, exports and responsive layouts were checked. Both earlier Vercel addresses return HTTP 307 redirects to the permanent domain.
- GitHub Actions passed: https://github.com/ZeroCool0388/vendor-risk-triage/actions/runs/37841272546
- The CLI device login remained unavailable because Vercel's Allow Access button stayed disabled. That login was stopped; no CLI credential was created. Automatic deployments are not connected to GitHub yet. Future source changes need a deliberate Vercel deployment or a repository connection.

## Hosting boundaries

- The API supports 10 MB files locally; Vercel's function request-body limit is 4.5 MB for the combined upload payload. This is documented in the README and a hosting-level 413 gets a helpful UI message.
- Browser workspaces and uploads are session-only. Analyst overrides and edited questions persist in localStorage and are checked against the document-content fingerprint.
- The public demo should never receive real vendor material or have a spend-enabled provider key added without a deliberate operating decision.
- WebKit/Safari, physical mobile devices, real provider latency and production access controls are not covered by the Chromium demo checks.

## Source hygiene

The supplied author brief is preserved locally and excluded from public Git history. `.env*` is ignored except `.env.example`; no provider key is committed. Git author identity is local to this repository: Steve Grady, ZeroCool0388's GitHub noreply address.

The generated concept prompt is recorded in `docs/design/PROMPT.md`. The public sample data contains only fictional contacts and `.example` email/domain names. Brand/framework names in dependency declarations and documentation are ordinary implementation references.
