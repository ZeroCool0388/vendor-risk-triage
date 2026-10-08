"use client";
import { useState } from "react";
import { FileText, Download, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { Assessment } from "@/lib/schema";
import { buildMarkdown } from "@/lib/export/markdown";
export function ExportDialog({
  assessment,
  open,
  onClose,
}: {
  assessment: Assessment | null;
  open: boolean;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  async function download(kind: "pdf" | "md") {
    if (!assessment || busy) return;
    setBusy(true);
    try {
      const blob =
        kind === "md"
          ? new Blob([buildMarkdown(assessment)], {
              type: "text/markdown;charset=utf-8",
            })
          : await (await import("@/lib/export/pdf")).buildPDF(assessment);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${assessment.vendorSlug}-risk-assessment.${kind}`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
      toast.success(
        `${kind === "pdf" ? "PDF" : "Markdown"} report downloaded.`,
      );
    } catch {
      toast.error(
        "The report couldn't be generated. Try the other format or retry.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v && !busy) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export assessment</DialogTitle>
          <DialogDescription>
            Your current scores, analyst notes, cited evidence and edited
            follow-ups, ready to share.
          </DialogDescription>
        </DialogHeader>
        <div className="export-options">
          <div className="export-option">
            <FileText className="text-primary" />
            <strong>PDF report</strong>
            <span>Clean, paginated and ready for a review meeting.</span>
            <Button disabled={busy} onClick={() => download("pdf")}>
              {busy ? (
                <LoaderCircle
                  className="animate-spin"
                  data-icon="inline-start"
                />
              ) : (
                <Download data-icon="inline-start" />
              )}
              Download PDF
            </Button>
          </div>
          <div className="export-option">
            <FileText className="text-primary" />
            <strong>Markdown report</strong>
            <span>Editable evidence and decisions for your audit trail.</span>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => download("md")}
            >
              <Download data-icon="inline-start" />
              Download Markdown
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Includes the generated date, review source and a synthetic demo data
          footer.
        </p>
      </DialogContent>
    </Dialog>
  );
}
