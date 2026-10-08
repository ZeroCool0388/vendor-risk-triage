import framework from "../../data/scoring-framework.json";
import type { AssessedFinding, Domain, Finding, Severity } from "./schema";
export { framework };
export function rating(score: number): Severity {
  return score >= 80
    ? "Critical"
    : score >= 50
      ? "High"
      : score >= 25
        ? "Medium"
        : "Low";
}
export function findingScore(
  f: Pick<Finding, "severity" | "likelihood"> & { status?: string },
): number {
  if (f.status === "Mitigated") return 0;
  return (
    ((framework.severity[f.severity] * framework.likelihood[f.likelihood]) /
      16) *
    100
  );
}
export function scoreAssessment(findings: (Finding | AssessedFinding)[]) {
  const breakdown = framework.domains.map((d) => {
    const group = findings.filter((f) => f.domain === d.name);
    return {
      domain: d.name as Domain,
      weight: d.weight,
      assessed: group.length > 0,
      score: group.length
        ? group.reduce((n, f) => n + findingScore(f), 0) / group.length
        : 0,
      count: group.length,
    };
  });
  const assessed = breakdown.filter((d) => d.assessed);
  const denominator = assessed.reduce((n, d) => n + d.weight, 0);
  const score = denominator
    ? Math.round(
        assessed.reduce((n, d) => n + d.score * d.weight, 0) / denominator,
      )
    : 0;
  return {
    score,
    rating: rating(score),
    breakdown,
    assessedDomains: assessed.length,
  };
}
export function timeEstimate(wordCount: number) {
  // Four words/minute allows for reading, cross-checking and recording controls.
  const manualMinutes = Math.max(1, Math.round(wordCount / 4));
  const triageSeconds = Math.min(
    55,
    Math.max(10, Math.round(15 + wordCount / 52)),
  );
  return {
    manualMinutes,
    triageSeconds,
    hours: Math.round((manualMinutes / 60) * 10) / 10,
  };
}
