"use client";
import { useState } from "react";
import { Copy, ArrowUpRight, Mail } from "lucide-react";
import { toast } from "sonner";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { domains, type Assessment } from "@/lib/schema";
import { buildEmail } from "@/lib/export/markdown";
export function FollowUps({
  assessment,
  contactName,
  onEdit,
  onOpen,
}: {
  assessment: Assessment;
  contactName: string;
  onEdit: (id: string, question: string) => void;
  onOpen: (id: string) => void;
}) {
  const [emailOpen, setEmailOpen] = useState(false);
  const email = buildEmail(assessment, contactName);
  async function copy() {
    try {
      await navigator.clipboard.writeText(email);
      toast.success("Vendor email copied. Ready to review and send.");
    } catch {
      setEmailOpen(true);
      toast.info("Select the draft email below and copy it.");
    }
  }
  return (
    <section>
      <div className="followup-header">
        <div>
          <h2>Turn findings into a conversation.</h2>
          <p>Edit the questions, then copy a polite email for the vendor.</p>
        </div>
        <Button variant="outline" onClick={copy}>
          <Copy data-icon="inline-start" />
          Copy as email
        </Button>
      </div>
      {domains.map((domain) => {
        const questions = assessment.followUps.filter(
          (q) => q.domain === domain,
        );
        if (!questions.length) return null;
        return (
          <Card className="followup-group" key={domain}>
            <CardHeader>
              <CardTitle>{domain}</CardTitle>
            </CardHeader>
            <CardContent>
              {questions.map((q) => (
                <div className="followup-question" key={q.findingId}>
                  <button
                    className="question-link"
                    onClick={() => onOpen(q.findingId)}
                  >
                    {q.findingId} ·{" "}
                    {
                      assessment.findings.find((f) => f.id === q.findingId)
                        ?.finding
                    }
                    <ArrowUpRight size={11} />
                  </button>
                  <Field>
                    <FieldLabel
                      className="sr-only"
                      htmlFor={`question-${q.findingId}`}
                    >
                      Follow-up for {q.findingId}
                    </FieldLabel>
                    <Textarea
                      id={`question-${q.findingId}`}
                      value={q.question}
                      maxLength={10000}
                      rows={3}
                      onChange={(e) => onEdit(q.findingId, e.target.value)}
                    />
                  </Field>
                </div>
              ))}
            </CardContent>
          </Card>
        );
      })}
      <Button variant="ghost" size="sm" onClick={() => setEmailOpen(true)}>
        <Mail data-icon="inline-start" />
        Preview email draft
      </Button>
      <Dialog open={emailOpen} onOpenChange={setEmailOpen}>
        <DialogContent className="sm:max-w-[650px]">
          <DialogHeader>
            <DialogTitle>Vendor follow-up email</DialogTitle>
            <DialogDescription>
              Draft only. This app does not send email.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            readOnly
            value={email}
            rows={15}
            aria-label="Vendor email draft"
          />
          <Button onClick={copy}>
            <Copy data-icon="inline-start" />
            Copy draft
          </Button>
        </DialogContent>
      </Dialog>
    </section>
  );
}
