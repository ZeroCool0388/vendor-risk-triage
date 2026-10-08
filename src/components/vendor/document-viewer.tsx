"use client";
import { useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { VendorDocument, VerifiedEvidence } from "@/lib/schema";
export type ViewerSelection = {
  doc: VendorDocument;
  evidence?: VerifiedEvidence;
};
export function DocumentViewer({
  selection,
  onClose,
}: {
  selection: ViewerSelection | null;
  onClose: () => void;
}) {
  const highlight = useRef<HTMLElement>(null);
  useEffect(() => {
    const timeout = setTimeout(
      () =>
        highlight.current?.scrollIntoView({
          block: "center",
          behavior: "instant",
        }),
      200,
    );
    return () => clearTimeout(timeout);
  }, [selection]);
  return (
    <Dialog
      open={!!selection}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="sm:max-w-[850px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{selection?.doc.name}</DialogTitle>
          <DialogDescription>
            {selection?.doc.type} ·{" "}
            {selection?.doc.wordCount.toLocaleString("en-GB")} words
            {selection?.doc.pages ? ` · ${selection.doc.pages} pages` : ""}
            {selection?.evidence
              ? selection.evidence.verified
                ? " · Cited passage highlighted"
                : " · Unverified citation: passage could not be located"
              : ""}
          </DialogDescription>
        </DialogHeader>
        <div className="document-viewer">
          {selection?.doc.anchors.map((anchor, i) => {
            const e = selection.evidence;
            const quote = e?.verified ? e.matchedQuote : undefined;
            const index =
              quote && anchor.location === e?.matchedLocation
                ? anchor.text.indexOf(quote)
                : -1;
            return (
              <section key={i} className="document-anchor">
                <h3>{anchor.location}</h3>
                <pre>
                  {index >= 0 && quote ? (
                    <>
                      {anchor.text.slice(0, index)}
                      <mark ref={highlight} data-testid="citation-highlight">
                        {anchor.text.slice(index, index + quote.length)}
                      </mark>
                      {anchor.text.slice(index + quote.length)}
                    </>
                  ) : (
                    anchor.text
                  )}
                </pre>
              </section>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
