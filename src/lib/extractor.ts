import {
  ExtractionSchema,
  type Domain,
  type VendorDocument,
  type Extraction,
  type Severity,
} from "./schema";
type Rule = {
  domain: Domain;
  terms: RegExp;
  concern: RegExp;
  title: string;
  severity: Severity;
  followUp: string;
};
const rules: Rule[] = [
  {
    domain: "Access Control",
    terms: /\b(mfa|multi.factor|privileged|access review|administrator)\b/i,
    concern:
      /optional|not enforced|not mandatory|missed|overdue|no mfa|without mfa|mfa.{0,20}disabled/i,
    title: "Privileged access controls need follow-up",
    severity: "High",
    followUp:
      "Please provide evidence of mandatory MFA and completed privileged access reviews, including exception remediation.",
  },
  {
    domain: "Data Protection",
    terms: /\b(data|transfer|encrypt|key rotation|scc|contractual clauses)\b/i,
    concern:
      /outside|singapore|united states|no signed|without.{0,20}scc|unencrypted|annually|not.{0,20}implemented/i,
    title: "Data protection arrangements need clarification",
    severity: "High",
    followUp:
      "Please confirm data locations, transfer safeguards, encryption and key rotation controls with dated supporting evidence.",
  },
  {
    domain: "Business Continuity",
    terms: /\b(recovery|rpo|rto|disaster|backup)\b/i,
    concern:
      /never|not tested|untested|24 hours|48 hours|no.{0,30}(report|test)|draft|planned/i,
    title: "Recovery capability is not demonstrated",
    severity: "High",
    followUp:
      "Please share the latest recovery exercise results and measured RPO/RTO against agreed targets.",
  },
  {
    domain: "Incident Response",
    terms: /\b(breach|incident|notif)\b/i,
    concern: /72 hours|96 hours|no.{0,30}(plan|process)|not.{0,20}documented/i,
    title: "Incident notification requires review",
    severity: "High",
    followUp:
      "Can you commit to initial notification within 24 hours and provide the incident escalation procedure?",
  },
  {
    domain: "Vendor Sub-processors",
    terms: /\b(sub.?processor|offshore|downstream|supplier)\b/i,
    concern:
      /not.{0,40}(disclosed|included|provided|retained)|no.{0,20}(oversight|evidence)|undisclosed|not yet/i,
    title: "Subprocessor oversight is incomplete",
    severity: "High",
    followUp:
      "Please provide a complete subprocessor register and evidence of downstream oversight and transfer safeguards.",
  },
  {
    domain: "Compliance & Certifications",
    terms: /\b(penetration|pen test|audit|soc 2|certif)\b/i,
    concern:
      /18 months|no dated|not.{0,20}(provided|scheduled)|exception|overdue|missed/i,
    title: "Assurance evidence is incomplete or overdue",
    severity: "Medium",
    followUp:
      "Please share current independent assurance reports, test dates and the remediation status of open issues.",
  },
  {
    domain: "Contractual",
    terms: /\b(dpa|contract|audit right|liability)\b/i,
    concern:
      /not.{0,20}(signed|agreed)|missing|no.{0,20}(dpa|audit right)|unsigned/i,
    title: "Contract commitments need confirmation",
    severity: "Medium",
    followUp:
      "Please provide the executed DPA and agreed security, audit and breach notification commitments.",
  },
];
export function extractRuleBased(documents: VendorDocument[]): Extraction {
  const findings: Extraction["findings"] = [];
  for (const rule of rules) {
    let evidence: Extraction["findings"][number]["evidence"] = [];
    for (const doc of documents) {
      for (const anchor of doc.anchors) {
        const lines = anchor.text
          .split(/\n|(?<=[.!?])\s+/)
          .filter((x) => x.trim().length >= 8);
        const hit = lines.find(
          (x) => rule.terms.test(x) && rule.concern.test(x),
        );
        if (hit) {
          evidence = [
            { docId: doc.id, location: anchor.location, quote: hit.trim() },
          ];
          break;
        }
      }
      if (evidence.length) break;
    }
    if (evidence.length)
      findings.push({
        id: `RB-${String(findings.length + 1).padStart(2, "0")}`,
        domain: rule.domain,
        finding: rule.title,
        severity: rule.severity,
        likelihood: "Likely",
        evidence,
        isGap: /no.{0,30}(evidence|report)|not.{0,25}provided/i.test(
          evidence[0].quote,
        ),
        description:
          "A deterministic keyword check identified this passage for analyst review. This is a limited screening result, not a full AI interpretation.",
        whyItMatters:
          "The control may affect the intended data use or service resilience. Validate the context and supporting evidence before accepting the vendor.",
        recommendedFollowUp: rule.followUp,
      });
    else
      findings.push({
        id: `RB-${String(findings.length + 1).padStart(2, "0")}`,
        domain: rule.domain,
        finding: `${rule.domain}: evidence needs analyst review`,
        severity: "Low",
        likelihood: "Unlikely",
        evidence: [],
        isGap: true,
        description:
          "The limited demo rules did not identify a clear negative statement in this domain. Control effectiveness has not been established; absence of a rule match is not proof of safety.",
        whyItMatters:
          "An analyst must check whether the submitted documents adequately cover this domain. Treat this as a coverage gap, not a confirmed control failure.",
        recommendedFollowUp: `Please provide current evidence for ${rule.domain.toLowerCase()} and explain how the controls apply to the proposed service.`,
      });
  }
  return ExtractionSchema.parse({
    executiveSummary: `Rule-based screening reviewed ${documents.length} document${documents.length === 1 ? "" : "s"}. ${findings.filter((x) => x.evidence.length).length} domain${findings.filter((x) => x.evidence.length).length === 1 ? "" : "s"} contain passages needing follow-up; other domains are explicit coverage gaps. This demo uses a small set of keyword rules. Review every finding and use live AI for a richer assessment.`,
    findings,
  });
}
