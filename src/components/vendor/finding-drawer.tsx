"use client";
import { CheckCircle2, AlertCircle, ArrowUpRight } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldDescription,
} from "@/components/ui/field";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Choice, SeverityBadge } from "./controls";
import {
  severities,
  statuses,
  type AssessedFinding,
  type VendorDocument,
  type VerifiedEvidence,
  type FindingStatus,
  type Severity,
} from "@/lib/schema";
export function FindingDrawer({
  finding,
  documents,
  onClose,
  onChange,
  onView,
}: {
  finding: AssessedFinding | null;
  documents: VendorDocument[];
  onClose: () => void;
  onChange: (
    id: string,
    patch: Partial<Pick<AssessedFinding, "severity" | "status" | "note">>,
  ) => void;
  onView: (doc: VendorDocument, evidence: VerifiedEvidence) => void;
}) {
  return (
    <Sheet
      open={!!finding}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent className="w-full sm:max-w-[510px] gap-5">
        <SheetHeader className="px-[22px] pt-7 pb-0">
          <SheetDescription>
            {finding?.id} · {finding?.domain}
          </SheetDescription>
          <SheetTitle className="pr-7 leading-snug">
            {finding?.finding}
          </SheetTitle>
          <div className="flex gap-2 pt-2">
            {finding && <SeverityBadge severity={finding.severity} />}{" "}
            {finding?.isGap && <Badge variant="outline">Evidence gap</Badge>}
          </div>
        </SheetHeader>
        {finding && (
          <div className="drawer-body">
            <section className="drawer-section">
              <h3>Finding</h3>
              <p>{finding.description}</p>
            </section>
            <section className="drawer-section">
              <h3>Why it matters</h3>
              <p>{finding.whyItMatters}</p>
            </section>
            <section className="drawer-section">
              <h3>Cited evidence</h3>
              {finding.isGap && (
                <Alert className="mb-3">
                  <AlertCircle />
                  <AlertTitle>Evidence gap</AlertTitle>
                  <AlertDescription>
                    Supporting control evidence is missing or incomplete. A
                    quoted admission of a gap is not proof the control exists.
                  </AlertDescription>
                </Alert>
              )}
              {finding.evidence.length === 0 && (
                <p>
                  No supporting passage was supplied. Request evidence before
                  relying on this finding.
                </p>
              )}
              {finding.evidence.map((e, i) => {
                const doc = documents.find((d) => d.id === e.docId);
                return (
                  <div
                    key={i}
                    className={`evidence-block ${e.verified ? "" : "unverified"}`}
                  >
                    <div className="evidence-reference">
                      {doc?.name ?? e.docId}
                      <br />
                      {e.matchedLocation ?? e.location}
                    </div>
                    <div
                      className={`citation-status ${e.verified ? "" : "unverified"}`}
                    >
                      {e.verified ? (
                        <CheckCircle2 size={12} />
                      ) : (
                        <AlertCircle size={12} />
                      )}{" "}
                      {e.verified
                        ? e.match === "fuzzy"
                          ? "Verified with one text difference — check source"
                          : "Verified in source"
                        : "Unverified — quotation not found"}
                    </div>
                    <blockquote>“{e.quote}”</blockquote>
                    {e.match === "fuzzy" && (
                      <p className="mb-3">Actual source: “{e.matchedQuote}”</p>
                    )}
                    {doc && (
                      <Button
                        variant="link"
                        size="sm"
                        className="p-0 h-auto"
                        onClick={() => onView(doc, e)}
                      >
                        View in document
                        <ArrowUpRight data-icon="inline-end" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </section>
            <section className="drawer-section">
              <h3>Analyst decision</h3>
              <FieldGroup>
                <Field>
                  <FieldLabel>Severity override</FieldLabel>
                  <Choice
                    label="Severity override"
                    value={finding.severity}
                    options={severities.map((s) => ({ value: s, label: s }))}
                    onChange={(severity) =>
                      onChange(finding.id, { severity: severity as Severity })
                    }
                  />
                  <FieldDescription>
                    Original: {finding.originalSeverity}. The overall score
                    updates immediately.
                  </FieldDescription>
                </Field>
                <Field>
                  <FieldLabel>Status</FieldLabel>
                  <Choice
                    label="Finding status"
                    value={finding.status}
                    options={statuses.map((s) => ({ value: s, label: s }))}
                    onChange={(status) =>
                      onChange(finding.id, { status: status as FindingStatus })
                    }
                  />
                  <FieldDescription>
                    Accepted risks remain scored. Mitigated risks score zero.
                  </FieldDescription>
                </Field>
                <Field>
                  <FieldLabel htmlFor="analyst-note">Analyst note</FieldLabel>
                  <Textarea
                    id="analyst-note"
                    value={finding.note}
                    placeholder="Record the context behind your decision…"
                    maxLength={5000}
                    rows={3}
                    onChange={(e) =>
                      onChange(finding.id, { note: e.target.value })
                    }
                  />
                  <FieldDescription>
                    Saved in this browser for this document set.
                  </FieldDescription>
                </Field>
              </FieldGroup>
            </section>
            <section className="drawer-section">
              <h3>Recommended follow-up</h3>
              <p>{finding.recommendedFollowUp}</p>
            </section>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
