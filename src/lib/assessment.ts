import {
  AssessmentSchema,
  type Extraction,
  type VendorDocument,
  type Mode,
} from "./schema";
import { verifyCitation } from "./citations";
import { scoreAssessment } from "./scoring";
export function assembleAssessment(
  extraction: Extraction,
  documents: VendorDocument[],
  vendor: { slug: string; name: string },
  mode: Mode,
  generatedAt = new Date().toISOString(),
) {
  const ids = new Set<string>();
  const findings = extraction.findings.map((f, index) => {
    const id = ids.has(f.id) ? `${f.id}-${index + 1}` : f.id;
    ids.add(id);
    return {
      ...f,
      id,
      isGap: f.isGap || f.evidence.length === 0,
      evidence: f.evidence.map((e) => verifyCitation(e, documents)),
      status: "Needs follow-up" as const,
      note: "",
      originalSeverity: f.severity,
    };
  });
  return AssessmentSchema.parse({
    id: `${vendor.slug}-${generatedAt}`,
    vendorSlug: vendor.slug,
    vendorName: vendor.name,
    generatedAt,
    executiveSummary: extraction.executiveSummary,
    findings,
    documents,
    followUps: findings.map((f) => ({
      findingId: f.id,
      domain: f.domain,
      question: f.recommendedFollowUp,
    })),
    mode,
    baselineScore: scoreAssessment(findings).score,
  });
}
