import { z } from "zod";

export const domains = [
  "Access Control",
  "Data Protection",
  "Business Continuity",
  "Incident Response",
  "Vendor Sub-processors",
  "Compliance & Certifications",
  "Contractual",
] as const;
export const severities = ["Low", "Medium", "High", "Critical"] as const;
export const likelihoods = [
  "Unlikely",
  "Possible",
  "Likely",
  "Almost certain",
] as const;
export const statuses = ["Needs follow-up", "Accepted", "Mitigated"] as const;
export const documentTypes = [
  "Questionnaire",
  "Policy",
  "SOC 2 Summary",
  "DPA",
] as const;
export const AnchorSchema = z.object({
  location: z.string(),
  text: z.string(),
});
export const DocumentSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(documentTypes),
  text: z.string().min(1),
  wordCount: z.number().int().nonnegative(),
  pages: z.number().int().positive().optional(),
  anchors: z.array(AnchorSchema),
  source: z.enum(["seeded", "upload"]),
});
export const EvidenceSchema = z.object({
  docId: z.string(),
  quote: z.string().min(8),
  location: z.string(),
});
export const FindingSchema = z.object({
  id: z.string().min(1),
  domain: z.enum(domains),
  finding: z.string().min(1),
  description: z.string().min(1),
  whyItMatters: z.string().min(1),
  severity: z.enum(severities),
  likelihood: z.enum(likelihoods),
  evidence: z.array(EvidenceSchema).max(8),
  isGap: z.boolean(),
  recommendedFollowUp: z.string().min(1),
});
export const ExtractionSchema = z.object({
  executiveSummary: z.string().min(1),
  findings: z.array(FindingSchema).max(40),
});
export const VerifiedEvidenceSchema = EvidenceSchema.extend({
  verified: z.boolean(),
  match: z.enum(["exact", "normalized", "fuzzy", "unverified"]),
  matchedQuote: z.string().optional(),
  matchedLocation: z.string().optional(),
});
export const AssessedFindingSchema = FindingSchema.extend({
  evidence: z.array(VerifiedEvidenceSchema),
  status: z.enum(statuses),
  note: z.string(),
  originalSeverity: z.enum(severities),
});
export const FollowUpSchema = z.object({
  findingId: z.string(),
  domain: z.enum(domains),
  question: z.string(),
});
export const ModeSchema = z.object({
  kind: z.enum(["demo", "rule-based", "live"]),
  provider: z.string(),
  model: z.string(),
  label: z.string(),
});
export const AssessmentSchema = z.object({
  id: z.string(),
  vendorSlug: z.string(),
  vendorName: z.string(),
  generatedAt: z.string().datetime(),
  executiveSummary: z.string(),
  findings: z.array(AssessedFindingSchema),
  followUps: z.array(FollowUpSchema),
  documents: z.array(DocumentSchema),
  mode: ModeSchema,
  baselineScore: z.number().min(0).max(100),
});
export const VendorIndexSchema = z.array(
  z.object({
    slug: z.string(),
    name: z.string(),
    sector: z.string(),
    contactName: z.string(),
    contactEmail: z.email(),
    documents: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        file: z.string(),
        type: z.enum(documentTypes),
      }),
    ),
  }),
);
export type Domain = (typeof domains)[number];
export type Severity = (typeof severities)[number];
export type Likelihood = (typeof likelihoods)[number];
export type FindingStatus = (typeof statuses)[number];
export type VendorDocument = z.infer<typeof DocumentSchema>;
export type Finding = z.infer<typeof FindingSchema>;
export type AssessedFinding = z.infer<typeof AssessedFindingSchema>;
export type Evidence = z.infer<typeof EvidenceSchema>;
export type VerifiedEvidence = z.infer<typeof VerifiedEvidenceSchema>;
export type Extraction = z.infer<typeof ExtractionSchema>;
export type Assessment = z.infer<typeof AssessmentSchema>;
export type Mode = z.infer<typeof ModeSchema>;
export type Vendor = z.infer<typeof VendorIndexSchema>[number];
export type WorkspaceVendor = Vendor & {
  parsedDocuments: VendorDocument[];
  preview: Assessment | null;
};
