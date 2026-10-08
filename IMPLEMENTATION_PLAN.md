# VendorRisk Triage implementation plan

## Scope

Build the supplied brief as a self-contained Next.js application. Keep the original brief intact. All vendor material and contacts are fictional. The public app defaults to deterministic demo mode; provider credentials remain server-side.

## Delivery sequence

1. Scaffold Next.js, strict TypeScript, Tailwind v4 and shadcn primitives; configure checks and secret exclusions.
2. Generate three synthetic document sets, a genuine text-based Apex questionnaire PDF, validated fixtures and a shared scoring framework.
3. Implement document parsing, bounded intake, Zod schemas, quote verification, deterministic scoring, rule-based extraction and server-only provider routing.
4. Build the vendor workspace, staged progress, assessment dashboard, sortable/filterable findings, citation viewer, analyst drawer and editable follow-ups.
5. Add browser-only overrides, Markdown/PDF reports, dark mode and responsive/accessibility polish.
6. Verify unit tests, lint, types, production build, browser happy paths, uploads, exports and four viewport widths. Exercise provider adapters with controlled test responses; real live calls require configured keys.
7. Document setup, architecture, scoring, demo script, deployment and acceptance evidence; prepare an MIT-licensed Git repository attributed to Steve Grady.

## Design system

White sidebar and surfaces; cool grey canvas; deep teal primary action; slate body text. Risk colors reserved for Critical/High/Medium/Low. Geist Sans, a 240px desktop vendor rail, compact document cards, one assessment panel and an open findings table. Focus-visible controls, accessible dialogs and mobile horizontal table scrolling. Follow-ups and document/evidence drawers reuse these tokens.

## Scoring decision

Per finding: severity (Low=1, Medium=2, High=3, Critical=4) × likelihood (Unlikely=1, Possible=2, Likely=3, Almost certain=4) / 16 × 100. Domain risk is the mean of its active findings. Overall risk is the weighted mean across assessed domains. Accepted risks remain scored; Mitigated risks contribute zero. An absent domain is unassessed, not automatically safe. Baseline and edited scores are labeled separately. Northwind fixtures are calibrated to 68/High using the same formula.

## External verification boundaries

No API keys or Vercel login are present during initial discovery. Build and fully verify the local demo first. Do not claim real OpenAI/Anthropic execution or public deployment without evidence. Do not create new accounts or incur API spending silently.

## Delivered and verified

Steps 1–7 implemented. The production build, lint, strict types, 20 unit/API tests and five complete browser scenarios pass. Actual desktop/mobile screenshots and a demo GIF are committed. PDF exports were checked as text and rendered pages. Publishing and hosting verification are recorded in `docs/VERIFICATION.md`; actual model calls remain pending private keys.
