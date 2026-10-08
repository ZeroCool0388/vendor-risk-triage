import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToFile,
} from "@react-pdf/renderer";
import {
  ExtractionSchema,
  type Finding,
  type Vendor,
  type Domain,
  type Severity,
  type Likelihood,
} from "../src/lib/schema";

const header = "SYNTHETIC DEMO DATA. Fictional company. Not real.";
const root = path.join(process.cwd(), "data");
const sections = [
  "Governance",
  "Access Control",
  "Data Protection",
  "Encryption",
  "BC/DR",
  "Incident Response",
  "Sub-processors",
  "Compliance",
];
const prefixes = ["GV", "AC", "DP", "EN", "BC", "IR", "SP", "CO"];
const questions = [
  [
    "Who owns information security?",
    "How are policies approved?",
    "How are employees trained?",
    "How are risks tracked?",
  ],
  [
    "How are users provisioned?",
    "Are privileged accounts reviewed?",
    "Is MFA enforced for every administrator?",
    "How are leavers removed?",
    "How is privileged access logged?",
  ],
  [
    "Where is customer data hosted?",
    "What transfer safeguards apply?",
    "How are retention periods enforced?",
    "How are deletion requests verified?",
    "Are data roles documented?",
  ],
  [
    "How is data encrypted at rest?",
    "How is data protected in transit?",
    "How often are encryption keys rotated?",
    "Who can access key material?",
  ],
  [
    "Is a disaster recovery exercise tested annually?",
    "What is the recovery point objective?",
    "What is the recovery time objective?",
    "How are backups protected?",
    "How are test outcomes tracked?",
  ],
  [
    "How are incidents detected?",
    "When are customers notified of a breach?",
    "How are incidents escalated?",
    "How are lessons learned documented?",
  ],
  [
    "Is a current subprocessor list maintained?",
    "How are offshore support providers disclosed?",
    "How are subprocessors assessed?",
    "How are changes communicated?",
  ],
  [
    "What certifications are held?",
    "When was the last penetration test?",
    "How are audit exceptions tracked?",
    "How are contract commitments reviewed?",
    "How is evidence shared?",
  ],
];
const common = [
  [
    "A designated security owner reports monthly to the board. The risk register is reviewed every quarter.",
    "Policies are approved annually by the executive team and version controlled in a restricted repository.",
    "All staff complete induction training and annual refresher training with completion tracked.",
    "Risks have named owners, target dates and documented review decisions.",
  ],
  [
    "Accounts require a manager-approved ticket and role-based permissions. Production access requires separate approval.",
    "Privileged access is checked quarterly by application owners and approval records are retained.",
    "MFA is enforced for all users and all administrative accounts, including remote access.",
    "Leaver accounts are disabled within four hours of HR notification and tokens are revoked.",
    "Privileged actions are recorded in central logs retained for twelve months and reviewed weekly.",
  ],
  [
    "Customer data is hosted in UK and EU regions, including backups and disaster recovery copies.",
    "No customer data transfers outside the UK or EU occur. Transfer safeguards are reviewed before any change.",
    "Retention schedules are agreed in the DPA and enforced through monthly automated deletion jobs.",
    "Deletion requests require tenant-owner approval and are supported by an audit record within thirty days.",
    "Data controller and processor roles are specified in the DPA with an agreed purpose and scope.",
  ],
  [
    "Customer data and backups use AES-256 encryption with tenant-scoped access to key services.",
    "TLS 1.2 or higher is enforced for client and internal service connections; legacy protocols are disabled.",
    "Encryption keys are rotated every quarter with dual approval and logged changes.",
    "Key administration is limited to two named security engineers; key use and changes are centrally logged.",
  ],
  [
    "A disaster recovery exercise is tested annually. The latest exercise met its recovery targets and remediation was closed.",
    "The recovery point objective is four hours, supported by hourly snapshots and transaction logs.",
    "The recovery time objective is eight hours, monitored through exercise reports.",
    "Backups are encrypted, isolated from production and checked weekly through restoration tests.",
    "Exercise findings have owners and deadlines. Progress is reviewed monthly by the security committee.",
  ],
  [
    "Alerts from endpoint, cloud and application logs are monitored continuously by the on-call security team.",
    "Customers are notified within 24 hours of confirmation of a personal data breach.",
    "Incidents are escalated to the incident commander, legal counsel and customer communications owner.",
    "Post-incident reviews occur within ten working days and track corrective actions to completion.",
  ],
  [
    "The current subprocessor list includes provider purpose, location, data access and review status.",
    "All offshore support providers are disclosed in the subprocessor register before they receive access.",
    "Subprocessors complete annual security due diligence and must provide evidence of downstream supplier reviews.",
    "Customers receive thirty days' advance notice of subprocessor changes and may raise objections.",
  ],
  [
    "A current SOC 2 Type II summary is available and audit evidence is shared under a confidentiality agreement.",
    "An independent penetration test was completed six months ago; all high findings are closed.",
    "Audit exceptions are tracked in the risk register and independently checked before closure.",
    "The legal owner reviews breach notice, retention, audit rights and transfer requirements before contracting.",
    "Evidence is available through a controlled review process with named document owners and dates.",
  ],
];
const configs: {
  slug: string;
  name: string;
  sector: string;
  contactName: string;
  contactEmail: string;
  docs: string[][];
  answers: Record<string, string>;
}[] = [
  {
    slug: "northwind-logistics",
    name: "Northwind Logistics Ltd",
    sector: "Logistics / freight SaaS",
    contactName: "Jordan Avery",
    contactEmail: "jordan.avery@northwind-logistics.example",
    docs: [
      ["security-questionnaire.md", "Security questionnaire", "Questionnaire"],
      [
        "information-security-policy.md",
        "Information security policy",
        "Policy",
      ],
      ["soc2-type2-summary.md", "SOC 2 Type II summary", "SOC 2 Summary"],
      ["subprocessor-list.md", "Subprocessor list", "Policy"],
    ],
    answers: {
      "AC-03":
        "MFA is optional for legacy administrator accounts. Enforcement is planned for the next quarter.",
      "AC-02":
        "Quarterly access reviews are scheduled, but the last two reviews were not completed on time.",
      "IR-02":
        "Customers are notified within 72 hours of confirmation of a personal data breach.",
      "SP-02":
        "Offshore support is provided by Harbor Support Services in the Philippines. This provider is not yet included in the customer subprocessor register.",
      "CO-02":
        "Industry-standard controls are in place. No dated penetration test report has been provided for this review.",
      "BC-01":
        "An annual recovery exercise is planned. No completed recovery exercise report has been supplied.",
    },
  },
  {
    slug: "apex-biolabs",
    name: "Apex BioLabs Ltd",
    sector: "Bioscience / LIMS provider",
    contactName: "Morgan Ellis",
    contactEmail: "morgan.ellis@apex-biolabs.example",
    docs: [
      ["security-questionnaire.pdf", "Security questionnaire", "Questionnaire"],
      ["data-protection-policy.md", "Data protection policy", "Policy"],
      ["bcp-dr-summary.md", "BCP / DR summary", "Policy"],
    ],
    answers: {
      "DP-01":
        "Customer data and backups are stored in Singapore and the United States.",
      "DP-02":
        "No signed Standard Contractual Clauses or UK transfer addendum are currently in place.",
      "BC-01":
        "The disaster recovery plan has never been tested. Recovery steps remain a draft.",
      "BC-02":
        "The recovery point objective is 24 hours. Daily snapshots are the only recovery mechanism.",
      "BC-03":
        "The recovery time objective is 48 hours, but it has not been validated through an exercise.",
      "CO-02":
        "The last independent penetration test was completed 18 months ago. A new test has not been scheduled.",
      "SP-03":
        "Industry-standard controls are in place. Individual review records are not retained.",
    },
  },
  {
    slug: "sterling-fintech",
    name: "Sterling FinTech Ltd",
    sector: "Financial services / payments API",
    contactName: "Taylor Rowan",
    contactEmail: "taylor.rowan@sterling-fintech.example",
    docs: [
      ["security-questionnaire.md", "Security questionnaire", "Questionnaire"],
      [
        "iso27001-certificate-summary.md",
        "ISO 27001 certificate summary",
        "Policy",
      ],
      ["incident-response-policy.md", "Incident response policy", "Policy"],
      ["soc2-type2-summary.md", "SOC 2 Type II summary", "SOC 2 Summary"],
    ],
    answers: {
      "EN-03":
        "Encryption keys are rotated annually. Quarterly rotation has not yet been implemented.",
      "SP-03":
        "Direct subprocessors are reviewed annually. Evidence of vendor-of-vendor oversight has not been provided.",
    },
  },
];
const vendors: Vendor[] = [];
function mkFinding(
  id: string,
  domain: Domain,
  finding: string,
  description: string,
  whyItMatters: string,
  severity: Severity,
  likelihood: Likelihood,
  quote: string,
  docId: string,
  location: string,
  isGap = false,
  followUp = "Please provide dated evidence and a remediation timeline.",
): Finding {
  return {
    id,
    domain,
    finding,
    severity,
    likelihood,
    evidence: [{ docId, quote, location }],
    isGap,
    description,
    whyItMatters,
    recommendedFollowUp: followUp,
  };
}
for (const config of configs) {
  const dir = path.join(root, "vendors", config.slug);
  await mkdir(dir, { recursive: true });
  const docs = config.docs.map(([file, name, type], i) => ({
    id: `${config.slug}-doc-${i + 1}`,
    file,
    name,
    type,
  })) as Vendor["documents"];
  const vendor: Vendor = {
    slug: config.slug,
    name: config.name,
    sector: config.sector,
    contactName: config.contactName,
    contactEmail: config.contactEmail,
    documents: docs,
  };
  vendors.push(vendor);
  const rows: string[] = [
    header,
    `# ${config.name} — Security questionnaire`,
    "Prepared for a fictional third-party risk review. Answers are self-reported and require analyst verification. This SIG-Lite-style questionnaire is a synthetic review artifact, not a certification.",
  ];
  const pdfSections: { location: string; text: string }[] = [];
  for (let s = 0; s < sections.length; s++) {
    rows.push(`## ${sections[s]}`);
    for (let q = 0; q < questions[s].length; q++) {
      const id = `${prefixes[s]}-${String(q + 1).padStart(2, "0")}`;
      const answer =
        (config.answers as Record<string, string>)[id] ?? common[s][q];
      const text = `id: ${id}\nsection: ${sections[s]}\nquestion: ${questions[s][q]}\nvendor_answer: ${answer}\nsupporting_evidence_ref: ${docs[1].file} / ${sections[s]}`;
      rows.push(`### ${id}\n${text}`);
      pdfSections.push({ location: `${sections[s]} / ${id}`, text });
    }
  }
  const md = rows.join("\n\n") + "\n";
  await writeFile(
    path.join(
      dir,
      config.slug === "apex-biolabs"
        ? "security-questionnaire.source.md"
        : "security-questionnaire.md",
    ),
    md,
  );
  if (config.slug === "apex-biolabs") {
    const styles = StyleSheet.create({
      page: {
        padding: 36,
        fontFamily: "Helvetica",
        fontSize: 10,
        lineHeight: 1.4,
      },
      heading: { fontSize: 18, marginBottom: 12 },
      section: { marginTop: 10, marginBottom: 5, fontSize: 12 },
      block: { marginBottom: 12 },
      footer: {
        position: "absolute",
        bottom: 18,
        left: 36,
        right: 36,
        height: 12,
        fontSize: 8,
        color: "#657080",
      },
    });
    await renderToFile(
      <Document>
        <Page size="A4" style={styles.page}>
          <Text style={{ fontSize: 8, marginBottom: 12 }}>{header}</Text>
          <Text style={styles.heading}>
            {config.name} — Security questionnaire
          </Text>
          {pdfSections.map((x) => (
            <View key={x.location} style={styles.block} wrap={false}>
              <Text style={styles.section}>{x.location}</Text>
              <Text>{x.text}</Text>
            </View>
          ))}
          <Text
            fixed
            style={styles.footer}
            render={({ pageNumber, totalPages }) =>
              `${header} | Page ${pageNumber} of ${totalPages}`
            }
          />
        </Page>
      </Document>,
      path.join(dir, "security-questionnaire.pdf"),
    );
  }
  const policies: Record<string, string> = {
    "information-security-policy.md": `# Information security policy\n\n## Governance\nThis policy applies to customer-facing systems and has a named security owner. Training, device encryption and central logging are required. Exceptions need a risk owner, deadline and board review.\n\n## Access Control\n${config.answers["AC-03"] ?? common[1][2]}\n\n## Incident Response\n${config.answers["IR-02"] ?? common[5][1]}\nThe incident commander maintains a case record and updates affected customers as evidence becomes available.\n\n## Business Continuity\n${config.answers["BC-01"] ?? common[4][0]}\n\n## Assurance\n${config.answers["CO-02"] ?? common[7][1]}`,
    "soc2-type2-summary.md": `# SOC 2 Type II summary\n\n## Scope\nSynthetic attestation summary for the customer platform, covering security and availability over a fictional twelve-month review period. This document is not an actual auditor report.\n\n## Access reviews\n${config.slug === "northwind-logistics" ? "The SOC 2 report records an exception: two quarterly privileged access reviews were missed and remediation remains open." : "No access review exceptions were identified in the synthetic review period. All sampled reviews were completed and approved."}\n\n## Availability\n${config.answers["BC-01"] ?? common[4][0]}\n\n## Complementary controls\nCustomer account owners must review tenant users, maintain strong authentication and classify data before upload.\n\n## Qualifications\nThis fictional summary does not replace the underlying assurance report or independent diligence.`,
    "subprocessor-list.md": `# Subprocessor list\n\n## Disclosed providers\nCloud hosting: Prairie Cloud Ltd, EU region, prairie-cloud.example. Service messaging: Beacon Relay Ltd, UK region, beacon-relay.example. Both providers are fictional.\n\n## Offshore support\n${config.answers["SP-02"] ?? common[6][1]}\n\n## Oversight\n${config.answers["SP-03"] ?? common[6][2]}\n\n## Change notice\nCustomers receive thirty days' advance notice of changes to the register. Review owner: ${config.contactName}; contact ${config.contactEmail}.`,
    "data-protection-policy.md": `# Data protection policy\n\n## Data location\n${config.answers["DP-01"] ?? common[2][0]}\n\n## International transfers\n${config.answers["DP-02"] ?? common[2][1]}\n\n## Encryption\n${common[3][0]}\n${common[3][1]}\n\n## Retention and deletion\n${common[2][2]}\n${common[2][3]}\n\n## Accountability\nThe policy owner is ${config.contactName}. Transfer compliance evidence must be supplied before approval.`,
    "bcp-dr-summary.md": `# Business continuity and disaster recovery\n\n## Exercise status\n${config.answers["BC-01"] ?? common[4][0]}\n\n## Recovery objectives\n${config.answers["BC-02"] ?? common[4][1]}\n${config.answers["BC-03"] ?? common[4][2]}\n\n## Backup controls\n${common[4][3]}\n\n## Remediation\nA named continuity owner is responsible for scheduling an exercise, recording outcomes and validating targets. No approved exercise date has been provided.`,
    "iso27001-certificate-summary.md": `# ISO 27001 certificate summary\n\n## Scope\nFictional certificate for the payments API information security management system. This is synthetic review material, not an actual certificate.\n\n## Control governance\nAnnual management review, quarterly internal audit, documented corrective action and supplier due diligence form the assurance programme.\n\n## Encryption\n${config.answers["EN-03"] ?? common[3][2]}\n\n## Supplier oversight\n${config.answers["SP-03"] ?? common[6][2]}\n\n## Verification\nCertificate validity and scope require independent verification before reliance.`,
    "incident-response-policy.md": `# Incident response policy\n\n## Detection\n${common[5][0]}\n\n## Notification\n${common[5][1]}\n\n## Escalation\n${common[5][2]}\n\n## Review\n${common[5][3]}\n\n## Exercises\nThe response team completes tabletop exercises twice a year and retains attendance, scenario and improvement records.`,
  };
  for (const doc of docs.slice(1))
    await writeFile(
      path.join(dir, doc.file),
      `${header}\n\n${policies[doc.file]}\n`,
    );
  const d = (i: number) => docs[i].id;
  let findings: Finding[] = [];
  let executiveSummary = "";
  if (config.slug === "northwind-logistics") {
    findings = [
      mkFinding(
        "NW-01",
        "Access Control",
        "MFA not enforced for privileged accounts",
        "Northwind's questionnaire says MFA remains optional for legacy administrator accounts, with enforcement planned for next quarter. Those accounts can still authenticate without the additional factor required by the review.",
        "A stolen administrator password could give an attacker privileged access to Northwind's freight platform and customer data. The planned rollout leaves exposure until enforcement is demonstrated; assess interim restrictions on those legacy accounts.",
        "High",
        "Almost certain",
        config.answers["AC-03"]!,
        d(0),
        "Access Control / AC-03",
        false,
        "Please confirm when MFA will be mandatory for every administrator, and provide evidence of enforcement and any interim safeguards.",
      ),
      mkFinding(
        "NW-02",
        "Incident Response",
        "Breach notification exceeds the 24-hour review target",
        "Northwind's security policy commits to notifying customers within 72 hours after confirming a personal data breach. That window is longer than this review's 24-hour initial notification target.",
        "A slower initial warning from Northwind could delay a customer's investigation, containment and communications about affected logistics data. Agree an escalation route and initial notice timing that fit the customer's response process; the 24-hour target is a review requirement, not a stated legal deadline.",
        "High",
        "Almost certain",
        config.answers["IR-02"]!,
        d(1),
        "Incident Response",
        false,
        "Can you agree a 24-hour initial breach notification commitment and share your escalation procedure?",
      ),
      mkFinding(
        "NW-03",
        "Vendor Sub-processors",
        "Offshore support provider is not disclosed",
        "Northwind identifies Harbor Support Services in the Philippines as its offshore support provider but says the provider has not been added to the customer subprocessor register. The register therefore does not reflect the disclosed support arrangement.",
        "Customers may approve Northwind using an incomplete picture of who supports the platform and where support occurs. Clarify Harbor's data access and processing role so the customer can assess disclosure, contractual commitments and any required transfer safeguards.",
        "High",
        "Almost certain",
        config.answers["SP-02"]!,
        d(3),
        "Offshore support",
        false,
        "Please update the subprocessor register with Harbor Support Services, its access scope, processing location and transfer safeguards.",
      ),
      mkFinding(
        "NW-04",
        "Access Control",
        "SOC 2 exception on privileged access reviews",
        "Northwind's SOC 2 summary records two missed quarterly privileged access reviews and says remediation remains open. The submitted assurance material does not show that the missed reviews have since been completed.",
        "Missed reviews can leave unnecessary or outdated administrator permissions in Northwind's platform. This is an unresolved assurance exception distinct from the MFA weakness; request completed review records and evidence that inappropriate access was removed.",
        "High",
        "Almost certain",
        "The SOC 2 report records an exception: two quarterly privileged access reviews were missed and remediation remains open.",
        d(2),
        "Access reviews",
        false,
        "Please share the remediation owner, completion date and evidence that the missed access reviews have been completed.",
      ),
      mkFinding(
        "NW-05",
        "Compliance & Certifications",
        "No current penetration test evidence",
        "Northwind's questionnaire refers to industry-standard controls but supplies no dated penetration test report for this review. The test date, scope, findings and remediation status cannot be established from the submitted material.",
        "The customer cannot judge whether independent testing has covered Northwind's current freight platform or whether significant weaknesses remain open. This is an evidence gap, not proof that testing never occurred; obtain a current summary before relying on the assurance claim.",
        "Medium",
        "Almost certain",
        config.answers["CO-02"]!,
        d(0),
        "Compliance / CO-02",
        true,
        "Please provide the latest dated independent penetration test summary, scope and remediation status.",
      ),
      mkFinding(
        "NW-06",
        "Business Continuity",
        "Recovery exercise has not been evidenced",
        "Northwind's policy says an annual recovery exercise is planned, but no completed exercise report has been supplied. The review therefore lacks measured evidence of the platform's recovery performance.",
        "An outage at Northwind could interrupt customers' logistics workflows without demonstrated recovery times to support planning. A scheduled exercise alone does not validate restoration; request measured results and corrective actions rather than assuming the recovery process has failed.",
        "High",
        "Likely",
        config.answers["BC-01"]!,
        d(1),
        "Business Continuity",
        true,
        "Please provide a completed disaster recovery exercise report with measured recovery times and corrective actions.",
      ),
    ];
    executiveSummary =
      "Northwind's evidence identifies material gaps in privileged access, incident notification and subprocessor transparency. Optional administrator MFA and unresolved SOC 2 access review exceptions need attention before approval. Request current penetration testing and recovery exercise evidence, and confirm the offshore support arrangement against your intended data use.";
  } else if (config.slug === "apex-biolabs") {
    findings = [
      mkFinding(
        "AP-01",
        "Business Continuity",
        "Disaster recovery plan has never been tested",
        "Apex's continuity summary states that its disaster recovery plan has never been tested and that recovery steps remain in draft. There is no completed exercise to validate those procedures for its laboratory information service.",
        "During a major outage, Apex may discover that the draft steps cannot restore the LIMS reliably, delaying access to laboratory records and workflows. An exercise is needed to demonstrate that staff, backups and dependencies can support recovery before production reliance.",
        "Critical",
        "Likely",
        config.answers["BC-01"]!,
        d(2),
        "Exercise status",
        false,
        "Please schedule and complete a disaster recovery exercise and share measured recovery results before production onboarding.",
      ),
      mkFinding(
        "AP-02",
        "Business Continuity",
        "24-hour recovery point risks a full day of data loss",
        "Apex specifies a 24-hour recovery point objective and says daily snapshots are its only recovery mechanism. This permits a recovery point up to a day behind the latest laboratory records, exceeding the review's four-hour target.",
        "After a failure, customers could need to reconstruct up to a day's laboratory entries and reconcile work completed since the last snapshot. Decide whether that potential loss fits the intended LIMS use and ask Apex to demonstrate more frequent recovery points if it does not.",
        "High",
        "Almost certain",
        config.answers["BC-02"]!,
        d(2),
        "Recovery objectives",
        false,
        "Can you support a four-hour RPO and supply evidence of backup restoration and transaction recovery?",
      ),
      mkFinding(
        "AP-03",
        "Data Protection",
        "International transfers lack documented safeguards",
        "Apex's data protection policy says no signed Standard Contractual Clauses or UK transfer addendum are currently in place. The submitted pack therefore does not establish documented safeguards for its international processing arrangement.",
        "The customer cannot confirm from Apex's pack which transfer mechanism and assessment support the intended personal-data use. Ask the appropriate privacy reviewer to confirm the applicable safeguards and required documentation before approving that processing arrangement.",
        "Critical",
        "Likely",
        config.answers["DP-02"]!,
        d(1),
        "International transfers",
        false,
        "Please provide executed transfer safeguards, a transfer assessment and the complete processing location register.",
      ),
      mkFinding(
        "AP-04",
        "Compliance & Certifications",
        "Penetration testing is overdue",
        "Apex's questionnaire dates its last independent penetration test to 18 months ago and says no new test has been scheduled. The review has no more recent assurance of the laboratory platform's security testing.",
        "Changes to Apex's LIMS and its integrations since the last test may not have been independently assessed. Request the test scope, outstanding remediation and a new test date to judge current exposure instead of treating the old report as current assurance.",
        "High",
        "Likely",
        config.answers["CO-02"]!,
        d(0),
        "Compliance / CO-02",
        false,
        "When will the next independent penetration test be completed? Please share the last report and open remediation items.",
      ),
      mkFinding(
        "AP-05",
        "Contractual",
        "Overseas storage requires a transfer review",
        "Apex's policy places customer data and backups in Singapore and the United States. The disclosed storage footprint needs to be checked against the customer's intended UK/EU data residency and backup requirements.",
        "If the customer's agreed residency scope excludes those locations, Apex's current hosting arrangement may not fit the proposed contract. Confirm approved primary and backup locations and any UK/EU hosting option; this contractual fit issue is separate from the missing transfer safeguards.",
        "High",
        "Almost certain",
        config.answers["DP-01"]!,
        d(1),
        "Data location",
        false,
        "Can you offer UK/EU hosting, and document contractual data residency commitments and backup locations?",
      ),
    ];
    executiveSummary =
      "Apex presents high operational and data protection risk. The recovery plan has never been tested, a 24-hour recovery point permits significant data loss, and international processing lacks documented transfer safeguards. Validate resilience and transfer arrangements before placing customer data in the service; obtain an updated penetration test.";
  } else {
    findings = [
      mkFinding(
        "SF-01",
        "Data Protection",
        "Encryption keys rotate annually",
        "Sterling's assurance summary states that encryption keys rotate annually and that quarterly rotation has not yet been implemented. The disclosed schedule is less frequent than the rotation target used for this review.",
        "A longer rotation interval could extend exposure if a Sterling encryption key were compromised without detection. Annual rotation alone does not prove weak encryption; assess key access controls, monitoring and emergency replacement before deciding whether the low-severity issue needs remediation.",
        "Low",
        "Possible",
        config.answers["EN-03"]!,
        d(1),
        "Encryption",
        false,
        "Can you move key rotation to a quarterly schedule or explain the compensating controls for annual rotation?",
      ),
      mkFinding(
        "SF-02",
        "Vendor Sub-processors",
        "Downstream supplier oversight is not evidenced",
        "Sterling says it reviews direct subprocessors annually, but it has not provided evidence of their oversight of downstream suppliers. The submitted assurance stops at Sterling's immediate supplier relationships.",
        "A direct subprocessor may depend on further suppliers whose security and data access have not been demonstrated in Sterling's pack. Obtain evidence of how those dependencies are assessed and monitored; missing review records do not establish that downstream controls are absent.",
        "Medium",
        "Likely",
        config.answers["SP-03"]!,
        d(1),
        "Supplier oversight",
        true,
        "Please provide evidence that your direct subprocessors assess and monitor their downstream suppliers.",
      ),
    ];
    executiveSummary =
      "Sterling demonstrates mature access, incident response and assurance controls in the submitted material. The remaining issues are annual encryption key rotation and incomplete evidence of downstream supplier oversight. Targeted follow-up should clarify the latter before approval; other domains still require analyst review rather than assuming absence of findings proves safety.";
  }
  await mkdir(path.join(root, "mock-responses"), { recursive: true });
  await writeFile(
    path.join(root, "mock-responses", `${config.slug}.json`),
    JSON.stringify(
      ExtractionSchema.parse({ executiveSummary, findings }),
      null,
      2,
    ) + "\n",
  );
}
await writeFile(
  path.join(root, "vendors", "index.json"),
  JSON.stringify(vendors, null, 2) + "\n",
);
await writeFile(
  path.join(root, "scoring-framework.json"),
  JSON.stringify(
    {
      domains: [
        { name: "Access Control", weight: 0.22 },
        { name: "Data Protection", weight: 0.18 },
        { name: "Business Continuity", weight: 0.15 },
        { name: "Incident Response", weight: 0.15 },
        { name: "Vendor Sub-processors", weight: 0.12 },
        { name: "Compliance & Certifications", weight: 0.1 },
        { name: "Contractual", weight: 0.08 },
      ],
      severity: { Low: 1, Medium: 2, High: 3, Critical: 4 },
      likelihood: { Unlikely: 1, Possible: 2, Likely: 3, "Almost certain": 4 },
      bands: [
        { min: 0, max: 24, label: "Low" },
        { min: 25, max: 49, label: "Medium" },
        { min: 50, max: 79, label: "High" },
        { min: 80, max: 100, label: "Critical" },
      ],
    },
    null,
    2,
  ) + "\n",
);
console.log(
  "Generated three synthetic vendor packs, three fixtures and the Apex PDF.",
);
