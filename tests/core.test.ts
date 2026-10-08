import { describe, it, expect } from "vitest";
import { readFile } from "node:fs/promises";
import { findingScore, scoreAssessment } from "../src/lib/scoring";
import {
  parseDocument,
  splitSections,
  MAX_FILE_BYTES,
} from "../src/lib/parser";
import { verifyCitation, findQuote } from "../src/lib/citations";
import { ExtractionSchema, type Finding } from "../src/lib/schema";
import { loadWorkspaces, loadMock } from "../src/lib/vendors";
import { extractRuleBased } from "../src/lib/extractor";
import { buildMarkdown, buildEmail } from "../src/lib/export/markdown";
import {
  applyOverrides,
  overrideKey,
  serializeOverrides,
} from "../src/lib/overrides";
const finding = {
  id: "T-1",
  domain: "Access Control",
  finding: "Test risk",
  description: "Test description",
  whyItMatters: "Test impact",
  severity: "High",
  likelihood: "Likely",
  evidence: [],
  isGap: true,
  recommendedFollowUp: "Please send evidence.",
} as Finding;
const meta = {
  id: "upload-1",
  name: "sample.md",
  type: "Policy",
  source: "upload",
} as const;
describe("transparent scoring", () => {
  it("uses severity × likelihood and keeps acceptance distinct from mitigation", () => {
    expect(findingScore(finding)).toBe(56.25);
    expect(findingScore({ ...finding, status: "Accepted" })).toBe(56.25);
    expect(findingScore({ ...finding, status: "Mitigated" })).toBe(0);
  });
  it("weights domain means and treats absent domains as unassessed", () => {
    const s = scoreAssessment([
      finding,
      {
        ...finding,
        id: "T-2",
        domain: "Data Protection",
        severity: "Critical",
        likelihood: "Almost certain",
      },
    ]);
    expect(s.score).toBe(76);
    expect(s.assessedDomains).toBe(2);
    expect(s.breakdown.find((d) => d.domain === "Contractual")?.assessed).toBe(
      false,
    );
  });
  it("is deterministic and responds to severity overrides", () => {
    const initial = scoreAssessment([finding]);
    expect(initial).toEqual(scoreAssessment([finding]));
    expect(
      scoreAssessment([{ ...finding, severity: "Low" }]).score,
    ).toBeLessThan(initial.score);
  });
});
describe("document intake", () => {
  it("retains Markdown section anchors and text files", async () => {
    expect(
      splitSections("Intro\n## Access\nMFA is optional.").map(
        (x) => x.location,
      ),
    ).toEqual(["Document start", "Access"]);
    const doc = await parseDocument(
      new TextEncoder().encode("# Access\nMFA is optional."),
      meta,
    );
    expect(doc.anchors[0].location).toBe("Access");
    expect(doc.wordCount).toBe(5);
    const txt = await parseDocument(
      new TextEncoder().encode("MFA is optional for administrators."),
      { ...meta, name: "sample.txt" },
    );
    expect(txt.text).toContain("optional");
  });
  it("rejects unsupported, empty, oversized and corrupt documents", async () => {
    await expect(parseDocument(new Uint8Array(), meta)).rejects.toThrow(
      "no readable text",
    );
    await expect(
      parseDocument(new Uint8Array(MAX_FILE_BYTES + 1), meta),
    ).rejects.toThrow("too large");
    await expect(
      parseDocument(new Uint8Array([1]), { ...meta, name: "bad.exe" }),
    ).rejects.toThrow("Choose a PDF");
    await expect(
      parseDocument(new Uint8Array([1]), { ...meta, name: "bad.pdf" }),
    ).rejects.toThrow("couldn't read");
  });
  it("extracts real committed PDF text and page anchors", async () => {
    const doc = await parseDocument(
      await readFile("data/vendors/apex-biolabs/security-questionnaire.pdf"),
      { ...meta, name: "questionnaire.pdf" },
    );
    expect(doc.pages).toBeGreaterThan(1);
    expect(doc.anchors[0].location).toBe("Page 1");
    expect(doc.text).toContain("SYNTHETIC DEMO DATA");
    expect(doc.text).toContain("18 months ago");
  });
});
describe("citation verification", () => {
  it("verifies exact, normalized whitespace and a single conservative typo", () => {
    expect(
      findQuote(
        "MFA is optional for all administrative accounts.",
        "MFA is optional for all administrative accounts.",
      )?.match,
    ).toBe("exact");
    expect(
      findQuote(
        "MFA is\n optional for all administrative accounts.",
        "mfa is optional for all administrative accounts.",
      )?.match,
    ).toBe("normalized");
    expect(
      findQuote(
        "MFA is optional for all administrative accounts.",
        "MFA is optional for all administrativ accounts.",
      )?.match,
    ).toBe("fuzzy");
  });
  it("does not verify altered numbers, negation, fabricated quotes or document IDs", async () => {
    expect(
      findQuote(
        "Customers are notified within 72 hours of confirmation.",
        "Customers are notified within 24 hours of confirmation.",
      ),
    ).toBeNull();
    expect(
      findQuote(
        "MFA is not enforced for administrative accounts.",
        "MFA is enforced for administrative accounts.",
      ),
    ).toBeNull();
    expect(
      verifyCitation(
        { docId: "unknown", quote: "Made up quotation", location: "1" },
        [],
      ).verified,
    ).toBe(false);
    const doc = await parseDocument(
      new TextEncoder().encode(
        "# Access\nMFA is optional for administrator accounts.",
      ),
      meta,
    );
    expect(
      verifyCitation(
        {
          docId: doc.id,
          quote: "MFA is mandatory for administrator accounts.",
          location: "Access",
        },
        [doc],
      ).verified,
    ).toBe(false);
  });
});
describe("sample fixtures and exports", () => {
  it("validates all three packs and verifies every seeded quote including PDF citations", async () => {
    const vendors = await loadWorkspaces();
    expect(vendors).toHaveLength(3);
    for (const v of vendors) {
      expect(ExtractionSchema.safeParse(await loadMock(v.slug)).success).toBe(
        true,
      );
      expect(
        v.preview?.findings.every((f) => f.isGap || f.evidence.length > 0),
      ).toBe(true);
      for (const f of v.preview!.findings)
        for (const e of f.evidence)
          expect(e.verified, `${v.slug} ${f.id}: ${e.quote}`).toBe(true);
    }
    expect(vendors[0].preview!.baselineScore).toBe(68);
  });
  it("uses real quotes for uploaded documents and marks uncovered domains as gaps", async () => {
    const doc = await parseDocument(
      new TextEncoder().encode(
        "# Access\nMFA is optional for administrator accounts.\n# Recovery\nThe disaster recovery plan has never been tested.",
      ),
      meta,
    );
    const result = extractRuleBased([doc]);
    expect(result.findings).toHaveLength(7);
    expect(
      result.findings.find((f) => f.domain === "Access Control")?.evidence[0]
        .quote,
    ).toContain("optional");
    expect(result.findings.find((f) => f.domain === "Contractual")?.isGap).toBe(
      true,
    );
    for (const f of result.findings)
      for (const e of f.evidence)
        expect(verifyCitation(e, [doc]).verified).toBe(true);
  });
  it("exports notes, evidence, decisions, questions and synthetic disclaimer", async () => {
    const assessment = (await loadWorkspaces())[0].preview!;
    assessment.findings[0].note = "Compensating control validated.";
    assessment.findings[0].severity = "Medium";
    const md = buildMarkdown(assessment);
    expect(md).toContain("Compensating control validated.");
    expect(md).toContain("MFA is optional");
    expect(md).toContain("Synthetic demo data");
    expect(md).toContain("## Follow-up questions");
    expect(buildEmail(assessment, "Jordan Avery")).toContain(
      "Hello Jordan Avery",
    );
  });
  it("persists overrides per document content and rejects corrupted browser state", async () => {
    const assessment = (await loadWorkspaces())[0].preview!;
    const edited = structuredClone(assessment);
    edited.findings[0].severity = "Low";
    edited.followUps[0].question = "Please send the MFA policy.";
    const restored = applyOverrides(assessment, serializeOverrides(edited));
    expect(restored.findings[0].severity).toBe("Low");
    expect(restored.followUps[0].question).toBe("Please send the MFA policy.");
    expect(applyOverrides(assessment, "bad JSON")).toEqual(assessment);
    expect(
      overrideKey({
        ...assessment,
        documents: [{ ...assessment.documents[0], text: "Changed text" }],
      }),
    ).not.toBe(overrideKey(assessment));
  });
});
