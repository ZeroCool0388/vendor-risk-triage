import { z } from "zod";
import { severities, statuses, type Assessment } from "./schema";
const SavedSchema = z.object({
  findings: z.record(
    z.string(),
    z.object({
      severity: z.enum(severities),
      status: z.enum(statuses),
      note: z.string().max(5000),
    }),
  ),
  questions: z.record(z.string(), z.string().max(10000)),
});
export function overrideKey(assessment: Assessment) {
  const text = assessment.documents.map((d) => `${d.id}:${d.text}`).join("|");
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++)
    hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
  return `vendorrisk-v1:${assessment.vendorSlug}:${(hash >>> 0).toString(16)}`;
}
export function applyOverrides(
  assessment: Assessment,
  stored: string | null,
): Assessment {
  if (!stored) return assessment;
  try {
    const saved = SavedSchema.parse(JSON.parse(stored));
    return {
      ...assessment,
      findings: assessment.findings.map((f) => ({
        ...f,
        ...saved.findings[f.id],
      })),
      followUps: assessment.followUps.map((q) => ({
        ...q,
        question: saved.questions[q.findingId] ?? q.question,
      })),
    };
  } catch {
    return assessment;
  }
}
export function serializeOverrides(assessment: Assessment) {
  return JSON.stringify({
    findings: Object.fromEntries(
      assessment.findings.map((f) => [
        f.id,
        { severity: f.severity, status: f.status, note: f.note },
      ]),
    ),
    questions: Object.fromEntries(
      assessment.followUps.map((q) => [q.findingId, q.question]),
    ),
  });
}
