import { z } from "zod";
import { assembleAssessment } from "../src/lib/assessment";
import { verifyCitation } from "../src/lib/citations";
import { buildEmail, buildMarkdown } from "../src/lib/export/markdown";
import { extractRuleBased } from "../src/lib/extractor";
import {
  applyOverrides,
  overrideKey,
  serializeOverrides,
} from "../src/lib/overrides";
import { MAX_FILE_BYTES, parseDocument } from "../src/lib/parser";
import { configuredMode, systemPrompt } from "../src/lib/providers";
import {
  findingScore,
  rating,
  scoreAssessment,
  timeEstimate,
} from "../src/lib/scoring";
import {
  severities,
  statuses,
  type Assessment,
  type Mode,
  type VendorDocument,
} from "../src/lib/schema";
import {
  loadMock,
  loadSeedDocuments,
  loadVendorIndex,
  loadWorkspaces,
} from "../src/lib/vendors";

// Recorded fixtures and local rules only. This module never calls a model.
for (const key of [
  "OPENAI_API_KEY",
  "ANTHROPIC_API_KEY",
  "LLM_PROVIDER",
  "LLM_MODEL",
]) {
  delete process.env[key];
}

const generatedAt = "2026-10-08T12:00:00.000Z";
const demoMode = {
  kind: "demo",
  provider: "mock",
  model: "deterministic",
  label: "Demo mode: mock AI responses",
} as const satisfies Mode;
const ruleMode = {
  kind: "rule-based",
  provider: "rules",
  model: "keyword-v1",
  label: "Rule-based (demo mode)",
} as const satisfies Mode;

const UploadSchema = z.object({
  name: z.string().min(1),
  text: z.string().min(1),
  type: z.enum(["Questionnaire", "Policy", "SOC 2 Summary", "DPA"]).optional(),
});
const TriageSchema = z.object({
  task: z.literal("triage"),
  vendor: z.string().optional(),
  vendorName: z.string().optional(),
  docIds: z.array(z.string()).optional(),
  uploads: z.array(UploadSchema).optional(),
  env: z.record(z.string(), z.string()).optional(),
  forceDemo: z.boolean().optional(),
});
const OverrideScoreSchema = z.object({
  task: z.literal("override-score"),
  vendor: z.string(),
  findingId: z.string(),
  severity: z.enum(severities).optional(),
  status: z.enum(statuses).optional(),
});
const CitationSchema = z.object({
  task: z.literal("citation"),
  source: z.string(),
  quote: z.string(),
  docId: z.string().optional(),
  knownDoc: z.boolean().optional(),
  claimedLocation: z.string().optional(),
});
const ModeTaskSchema = z.object({
  task: z.literal("mode"),
  env: z.record(z.string(), z.string()),
});
const IntakeMarkdownSchema = z.object({
  task: z.literal("intake-markdown"),
  name: z.string(),
  text: z.string(),
});
const IntakePdfSchema = z.object({
  task: z.literal("intake-pdf"),
  vendor: z.string(),
  docId: z.string(),
});
const ExportSchema = z.object({
  task: z.literal("export"),
  vendor: z.string(),
  findingId: z.string(),
  note: z.string(),
  severity: z.enum(severities),
});
const PersistSchema = z.object({
  task: z.literal("persist"),
  vendor: z.string(),
});
const TaskOnlySchema = z.object({
  task: z.enum(["bands", "formula", "intake-errors", "assemble", "prompt"]),
});

function noModel(): Record<string, unknown> {
  return { calledModel: false, networkRequests: 0 };
}

function present(assessment: Assessment): Record<string, unknown> {
  const scored = scoreAssessment(assessment.findings);
  const words = assessment.documents.reduce((n, d) => n + d.wordCount, 0);
  const estimate = timeEstimate(words);
  const byId: Record<string, unknown> = {};
  for (const finding of assessment.findings) {
    const followUp = assessment.followUps.find(
      (item) => item.findingId === finding.id,
    );
    byId[finding.id] = {
      domain: finding.domain,
      severity: finding.severity,
      likelihood: finding.likelihood,
      isGap: finding.isGap,
      finding: finding.finding,
      description: finding.description,
      quote: finding.evidence[0]?.quote ?? "",
      verified: finding.evidence.every((item) => item.verified),
      match: finding.evidence[0]?.match ?? null,
      evidenceCount: finding.evidence.length,
      followUp: followUp?.question ?? "",
      status: finding.status,
    };
  }
  const byDomain: Record<string, unknown> = {};
  for (const finding of assessment.findings) {
    if (!byDomain[finding.domain]) byDomain[finding.domain] = byId[finding.id];
  }
  return {
    blockedLive: false,
    modeKind: assessment.mode.kind,
    provider: assessment.mode.provider,
    model: assessment.mode.model,
    label: assessment.mode.label,
    score: scored.score,
    rating: scored.rating,
    baselineScore: assessment.baselineScore,
    findingCount: assessment.findings.length,
    followUpCount: assessment.followUps.length,
    documentCount: assessment.documents.length,
    wordCount: words,
    manualMinutes: estimate.manualMinutes,
    triageSeconds: estimate.triageSeconds,
    hours: estimate.hours,
    assessedDomains: scored.assessedDomains,
    unassessedDomains: scored.breakdown
      .filter((domain) => !domain.assessed)
      .map((domain) => domain.domain),
    allEvidenceVerified: assessment.findings.every((finding) =>
      finding.evidence.every((item) => item.verified),
    ),
    allDocumentsSynthetic: assessment.documents.every((document) =>
      document.text.includes(
        "SYNTHETIC DEMO DATA. Fictional company. Not real.",
      ),
    ),
    executiveSummary: assessment.executiveSummary,
    byId,
    byDomain,
    pages: assessment.documents[0]?.pages ?? null,
    firstLocation: assessment.documents[0]?.anchors[0]?.location ?? null,
    error: null,
    ...noModel(),
  };
}

let indexPromise: ReturnType<typeof loadVendorIndex> | null = null;
let workspacePromise: ReturnType<typeof loadWorkspaces> | null = null;

function vendorIndex() {
  return (indexPromise ??= loadVendorIndex());
}

async function samplePack(slug: string) {
  const packs = await (workspacePromise ??= loadWorkspaces());
  const pack = packs.find((item) => item.slug === slug);
  if (!pack?.preview) throw new Error(`No sample pack for ${slug}.`);
  return structuredClone(pack);
}

async function triage(
  vars: z.infer<typeof TriageSchema>,
): Promise<Record<string, unknown>> {
  const uploads = vars.uploads ?? [];
  const index = await vendorIndex();
  const vendor = vars.vendor
    ? index.find((item) => item.slug === vars.vendor)
    : undefined;
  if (vars.vendor && !vendor)
    throw new Error(`Unknown sample vendor: ${vars.vendor}`);
  const docIds =
    vars.docIds ?? vendor?.documents.map((document) => document.id) ?? [];
  if (docIds.length && !vendor)
    throw new Error("Sample documents require a sample vendor.");
  if (docIds.length + uploads.length < 1 || docIds.length + uploads.length > 5)
    throw new Error("Select between one and five documents for this review.");
  const documents: VendorDocument[] = vendor
    ? await loadSeedDocuments(vendor, docIds)
    : [];
  for (let i = 0; i < uploads.length; i++) {
    const upload = uploads[i];
    documents.push(
      await parseDocument(new TextEncoder().encode(upload.text), {
        id: `upload-${i + 1}`,
        name: upload.name,
        type:
          upload.type ??
          (/questionnaire/i.test(upload.name)
            ? "Questionnaire"
            : /dpa/i.test(upload.name)
              ? "DPA"
              : "Policy"),
        source: "upload",
      }),
    );
  }
  let mode: Mode = vars.forceDemo ? demoMode : configuredMode(vars.env ?? {});
  if (mode.kind === "live") {
    return {
      blockedLive: true,
      modeKind: mode.kind,
      provider: mode.provider,
      model: mode.model,
      label: mode.label,
      documentCount: documents.length,
      score: null,
      executiveSummary: null,
      error: null,
      ...noModel(),
    };
  }
  const completeSeedPack = Boolean(
    vendor &&
    uploads.length === 0 &&
    docIds.length === vendor.documents.length &&
    vendor.documents.every((document) => docIds.includes(document.id)),
  );
  const extraction =
    completeSeedPack && vendor
      ? await loadMock(vendor.slug)
      : extractRuleBased(documents);
  if (!completeSeedPack) mode = ruleMode;
  return present(
    assembleAssessment(
      extraction,
      documents,
      {
        slug: vendor?.slug ?? "upload",
        name: vendor?.name ?? vars.vendorName ?? "Fictional Upload Ltd",
      },
      mode,
      generatedAt,
    ),
  );
}

async function overrideScore(
  vars: z.infer<typeof OverrideScoreSchema>,
): Promise<Record<string, unknown>> {
  const assessment = (await samplePack(vars.vendor)).preview;
  if (!assessment) throw new Error(`No sample pack for ${vars.vendor}.`);
  const finding = assessment.findings.find(
    (item) => item.id === vars.findingId,
  );
  if (!finding) throw new Error(`Unknown finding ${vars.findingId}.`);
  if (vars.severity) finding.severity = vars.severity;
  if (vars.status) finding.status = vars.status;
  const scored = scoreAssessment(assessment.findings);
  return {
    score: scored.score,
    rating: scored.rating,
    findingScore: findingScore(finding),
    severity: finding.severity,
    status: finding.status,
    error: null,
    ...noModel(),
  };
}

async function citation(
  vars: z.infer<typeof CitationSchema>,
): Promise<Record<string, unknown>> {
  const docId = vars.docId ?? "doc-1";
  const document = await parseDocument(new TextEncoder().encode(vars.source), {
    id: docId,
    name: "sample.md",
    type: "Policy",
    source: "upload",
  });
  const evidence = verifyCitation(
    {
      docId,
      quote: vars.quote,
      location: vars.claimedLocation ?? "Document start",
    },
    vars.knownDoc === false ? [] : [document],
  );
  return {
    verified: evidence.verified,
    match: evidence.match,
    matchedLocation: evidence.matchedLocation ?? null,
    matchedQuote: evidence.matchedQuote ?? null,
    error: null,
    ...noModel(),
  };
}

function modeTask(
  vars: z.infer<typeof ModeTaskSchema>,
): Record<string, unknown> {
  try {
    const mode = configuredMode(vars.env);
    return {
      blockedLive: false,
      modeKind: mode.kind,
      provider: mode.provider,
      model: mode.model,
      label: mode.label,
      error: null,
      ...noModel(),
    };
  } catch (error) {
    return {
      blockedLive: false,
      modeKind: null,
      provider: null,
      model: null,
      label: null,
      error: error instanceof Error ? error.message : String(error),
      ...noModel(),
    };
  }
}

async function intakeMessage(bytes: Uint8Array, name: string) {
  try {
    await parseDocument(bytes, {
      id: "upload-1",
      name,
      type: "Policy",
      source: "upload",
    });
    return "accepted";
  } catch (error) {
    return error instanceof Error ? error.message : "unknown";
  }
}

async function intakeErrors(): Promise<Record<string, unknown>> {
  const [empty, unsupported, oversized, corrupt] = await Promise.all([
    intakeMessage(new Uint8Array(), "sample.md"),
    intakeMessage(new Uint8Array([1]), "bad.exe"),
    intakeMessage(new Uint8Array(MAX_FILE_BYTES + 1), "big.md"),
    intakeMessage(new Uint8Array([1]), "bad.pdf"),
  ]);
  return { empty, unsupported, oversized, corrupt, error: null, ...noModel() };
}

async function intakeMarkdown(
  vars: z.infer<typeof IntakeMarkdownSchema>,
): Promise<Record<string, unknown>> {
  const document = await parseDocument(new TextEncoder().encode(vars.text), {
    id: "upload-1",
    name: vars.name,
    type: "Policy",
    source: "upload",
  });
  return {
    wordCount: document.wordCount,
    location: document.anchors[0]?.location ?? null,
    text: document.text,
    error: null,
    ...noModel(),
  };
}

async function intakePdf(
  vars: z.infer<typeof IntakePdfSchema>,
): Promise<Record<string, unknown>> {
  const vendor = (await vendorIndex()).find(
    (item) => item.slug === vars.vendor,
  );
  if (!vendor) throw new Error(`Unknown sample vendor: ${vars.vendor}`);
  const document = (await loadSeedDocuments(vendor, [vars.docId]))[0];
  return {
    pages: document.pages ?? 0,
    firstLocation: document.anchors[0]?.location ?? null,
    text: document.text,
    error: null,
    ...noModel(),
  };
}

async function exportReport(
  vars: z.infer<typeof ExportSchema>,
): Promise<Record<string, unknown>> {
  const pack = await samplePack(vars.vendor);
  const assessment = pack.preview;
  if (!assessment) throw new Error(`No sample pack for ${vars.vendor}.`);
  const finding = assessment.findings.find(
    (item) => item.id === vars.findingId,
  );
  if (!finding) throw new Error(`Unknown finding ${vars.findingId}.`);
  finding.note = vars.note;
  finding.severity = vars.severity;
  const scored = scoreAssessment(assessment.findings);
  const email = buildEmail(assessment, pack.contactName);
  return {
    markdown: buildMarkdown(assessment),
    email,
    score: scored.score,
    rating: scored.rating,
    baselineScore: assessment.baselineScore,
    emailGreeting: email.startsWith("Hello "),
    emailNamesVendor: email.includes(assessment.vendorName),
    error: null,
    ...noModel(),
  };
}

async function persist(
  vars: z.infer<typeof PersistSchema>,
): Promise<Record<string, unknown>> {
  const assessment = (await samplePack(vars.vendor)).preview;
  if (!assessment) throw new Error(`No sample pack for ${vars.vendor}.`);
  const edited = structuredClone(assessment);
  const editedFinding = edited.findings.find((item) => item.id === "NW-01");
  const editedQuestion = edited.followUps.find(
    (item) => item.findingId === "NW-01",
  );
  if (!editedFinding || !editedQuestion)
    throw new Error("NW-01 is not in this pack.");
  editedFinding.severity = "Low";
  editedFinding.note = "Compensating control recorded.";
  editedQuestion.question = "Please send the current MFA evidence.";
  const restored = applyOverrides(assessment, serializeOverrides(edited));
  const corrupt = applyOverrides(assessment, "bad JSON");
  const empty = applyOverrides(assessment, null);
  const changed = structuredClone(assessment);
  changed.documents[0].text += "\nChanged.";
  const restoredFinding = restored.findings.find((item) => item.id === "NW-01");
  return {
    restoredSeverity: restoredFinding?.severity ?? null,
    restoredNote: restoredFinding?.note ?? null,
    restoredQuestion:
      restored.followUps.find((item) => item.findingId === "NW-01")?.question ??
      null,
    corruptSeverity:
      corrupt.findings.find((item) => item.id === "NW-01")?.severity ?? null,
    emptySeverity:
      empty.findings.find((item) => item.id === "NW-01")?.severity ?? null,
    keyChanged: overrideKey(changed) !== overrideKey(assessment),
    keyPrefix: overrideKey(assessment).startsWith(
      `vendorrisk-v1:${vars.vendor}:`,
    ),
    error: null,
    ...noModel(),
  };
}

async function assemble(): Promise<Record<string, unknown>> {
  const document = await parseDocument(
    new TextEncoder().encode(
      "SYNTHETIC DEMO DATA. Fictional company. Not real.\n\n# Access\nMFA is optional for administrator accounts.",
    ),
    {
      id: "doc-1",
      name: "policy.md",
      type: "Policy",
      source: "upload",
    },
  );
  const assessment = assembleAssessment(
    {
      executiveSummary: "Synthetic screening check.",
      findings: [
        {
          id: "X",
          domain: "Access Control",
          finding: "First",
          description: "First description.",
          whyItMatters: "Needs review.",
          severity: "Low",
          likelihood: "Unlikely",
          evidence: [],
          isGap: false,
          recommendedFollowUp: "Please send access evidence.",
        },
        {
          id: "X",
          domain: "Contractual",
          finding: "Second",
          description: "Second description.",
          whyItMatters: "Needs review.",
          severity: "Low",
          likelihood: "Unlikely",
          evidence: [],
          isGap: false,
          recommendedFollowUp: "Please send the contract.",
        },
        {
          id: "Q",
          domain: "Incident Response",
          finding: "Unsourced notice claim",
          description: "The quotation is not in the supplied document.",
          whyItMatters: "An unverified quotation cannot support the finding.",
          severity: "Low",
          likelihood: "Unlikely",
          evidence: [
            {
              docId: "doc-1",
              quote: "Breach notice is sent within 24 hours always.",
              location: "Access",
            },
          ],
          isGap: false,
          recommendedFollowUp: "Please quote the notification commitment.",
        },
      ],
    },
    [document],
    { slug: "upload", name: "Fictional Upload Ltd" },
    demoMode,
    generatedAt,
  );
  return {
    ...present(assessment),
    firstId: assessment.findings[0]?.id ?? null,
    secondId: assessment.findings[1]?.id ?? null,
    thirdId: assessment.findings[2]?.id ?? null,
    firstGap: assessment.findings[0]?.isGap ?? null,
    secondGap: assessment.findings[1]?.isGap ?? null,
    thirdIsGap: assessment.findings[2]?.isGap ?? null,
    thirdVerified: assessment.findings[2]?.evidence[0]?.verified ?? null,
    thirdMatch: assessment.findings[2]?.evidence[0]?.match ?? null,
    thirdQuote: assessment.findings[2]?.evidence[0]?.quote ?? null,
  };
}

function bands(): Record<string, unknown> {
  return {
    band0: rating(0),
    band24: rating(24),
    band25: rating(25),
    band49: rating(49),
    band50: rating(50),
    band79: rating(79),
    band80: rating(80),
    band100: rating(100),
    error: null,
    ...noModel(),
  };
}

function formula(): Record<string, unknown> {
  return {
    highLikely: findingScore({ severity: "High", likelihood: "Likely" }),
    criticalCertain: findingScore({
      severity: "Critical",
      likelihood: "Almost certain",
    }),
    lowUnlikely: findingScore({ severity: "Low", likelihood: "Unlikely" }),
    mitigated: findingScore({
      severity: "High",
      likelihood: "Likely",
      status: "Mitigated",
    }),
    accepted: findingScore({
      severity: "High",
      likelihood: "Likely",
      status: "Accepted",
    }),
    error: null,
    ...noModel(),
  };
}

export async function runTask(vars: unknown): Promise<Record<string, unknown>> {
  try {
    const task = z.object({ task: z.string() }).parse(vars).task;
    switch (task) {
      case "triage":
        return await triage(TriageSchema.parse(vars));
      case "override-score":
        return await overrideScore(OverrideScoreSchema.parse(vars));
      case "citation":
        return await citation(CitationSchema.parse(vars));
      case "mode":
        return modeTask(ModeTaskSchema.parse(vars));
      case "intake-errors":
        TaskOnlySchema.parse(vars);
        return await intakeErrors();
      case "intake-markdown":
        return await intakeMarkdown(IntakeMarkdownSchema.parse(vars));
      case "intake-pdf":
        return await intakePdf(IntakePdfSchema.parse(vars));
      case "export":
        return await exportReport(ExportSchema.parse(vars));
      case "persist":
        return await persist(PersistSchema.parse(vars));
      case "assemble":
        TaskOnlySchema.parse(vars);
        return await assemble();
      case "bands":
        TaskOnlySchema.parse(vars);
        return bands();
      case "formula":
        TaskOnlySchema.parse(vars);
        return formula();
      case "prompt":
        TaskOnlySchema.parse(vars);
        return { systemPrompt, error: null, ...noModel() };
      default:
        throw new Error(`Unknown eval task: ${task}`);
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(
        error.issues
          .map(
            (issue) => `${issue.path.join(".") || "input"}: ${issue.message}`,
          )
          .join("; "),
      );
    }
    throw error;
  }
}
