import type { Assessment } from "../schema";
import { findingScore, scoreAssessment, timeEstimate } from "../scoring";
const escapeCell = (s: string) =>
  s.replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
export function buildMarkdown(assessment: Assessment) {
  const scored = scoreAssessment(assessment.findings);
  const estimate = timeEstimate(
    assessment.documents.reduce((n, d) => n + d.wordCount, 0),
  );
  const lines = [
    `# ${assessment.vendorName} — Vendor risk assessment`,
    "",
    `Generated: ${new Date(assessment.generatedAt).toISOString()}`,
    `Review source: ${assessment.mode.label}`,
    `Overall risk: **${scored.score}/100 — ${scored.rating}** (baseline ${assessment.baselineScore})`,
    "",
    "> SYNTHETIC DEMO DATA. Fictional company. Not real.",
    "",
    "## Executive summary",
    assessment.executiveSummary,
    "",
    "## Review context",
    `Manual estimate: ${estimate.hours} hours. AI estimate: ${estimate.triageSeconds} seconds. These are estimates, not measured performance.`,
    "These are review findings, not a vendor approval decision. Domains without findings are unassessed. Accepted risks remain in the score; mitigated risks contribute zero.",
    "",
    "## Risk by domain",
    "| Domain | Weight | Score | Coverage |",
    "| --- | ---: | ---: | --- |",
    ...scored.breakdown.map(
      (d) =>
        `| ${d.domain} | ${Math.round(d.weight * 100)}% | ${d.assessed ? Math.round(d.score) : "—"} | ${d.assessed ? "Assessed findings" : "Unassessed"} |`,
    ),
    "",
    "## Risk findings",
    "| ID | Domain | Finding | Severity | Likelihood | Score | Status |",
    "| --- | --- | --- | --- | --- | ---: | --- |",
    ...assessment.findings.map(
      (f) =>
        `| ${f.id} | ${f.domain} | ${escapeCell(f.finding)}${f.isGap ? " (Gap)" : ""} | ${f.severity} | ${f.likelihood} | ${Math.round(findingScore(f))} | ${f.status} |`,
    ),
    "",
    "## Findings and cited evidence",
  ];
  for (const f of assessment.findings) {
    lines.push(
      "",
      `### ${f.id}: ${f.finding}`,
      f.description,
      "",
      `Why it matters: ${f.whyItMatters}`,
      `Severity: ${f.severity} (original: ${f.originalSeverity}); status: ${f.status}; gap: ${f.isGap ? "Yes" : "No"}.`,
    );
    if (f.note) lines.push(`Analyst note: ${f.note}`);
    if (!f.evidence.length)
      lines.push("**Evidence gap: no supporting passage supplied.**");
    for (const e of f.evidence) {
      const doc = assessment.documents.find((d) => d.id === e.docId);
      lines.push(
        "",
        `Source: ${doc?.name ?? e.docId} / ${e.matchedLocation ?? e.location} — ${e.verified ? `${e.match} match` : "UNVERIFIED: passage was not located in the source"}`,
        `> ${e.quote.replace(/\n/g, "\n> ")}`,
      );
      if (e.match === "fuzzy")
        lines.push(`Matched source text: ${e.matchedQuote}`);
    }
  }
  lines.push("", "## Follow-up questions");
  for (const d of scored.breakdown) {
    const qs = assessment.followUps.filter((q) => q.domain === d.domain);
    if (qs.length) {
      lines.push(
        "",
        `### ${d.domain}`,
        ...qs.map((q) => `- [${q.findingId}] ${q.question}`),
      );
    }
  }
  lines.push(
    "",
    "## Documents reviewed",
    ...assessment.documents.map(
      (d) =>
        `- ${d.name} (${d.type}; ${d.wordCount} words${d.pages ? `; ${d.pages} pages` : ""})`,
    ),
    "",
    "## Scoring methodology",
    "Finding risk = severity (1–4) × likelihood (1–4) ÷ 16 × 100. Domain risk is the mean of its findings. Overall risk is the domain-weighted mean across assessed domains, rounded to an integer. Low 0–24, Medium 25–49, High 50–79, Critical 80–100. Mitigated findings score zero; accepted findings retain their score.",
    "",
    "---",
    "Synthetic demo data. Fictional companies and contacts. Not an audit, certification or legal opinion.",
  );
  return lines.join("\n");
}
export function buildEmail(assessment: Assessment, contactName: string) {
  return `Hello ${contactName || "team"},\n\nThank you for sharing the security documentation for ${assessment.vendorName}. To complete our review, could you help us with the following questions?\n\n${assessment.followUps.map((q) => `${q.domain} [${q.findingId}]\n${q.question}`).join("\n\n")}\n\nPlease include supporting evidence and any relevant remediation dates. We're happy to discuss the context of any item.\n\nThank you,\nVendor risk review team\n\nSynthetic demo data — draft only.`;
}
