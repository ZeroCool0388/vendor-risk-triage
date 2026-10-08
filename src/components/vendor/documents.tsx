"use client";
import { useRef, useState } from "react";
import { FileText, Upload, X, FolderOpen } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyMedia,
  EmptyContent,
} from "@/components/ui/empty";
import type { VendorDocument } from "@/lib/schema";
import { cn } from "@/lib/utils";
export function Documents({
  documents,
  files,
  onUpload,
  onRemove,
  onView,
  onRestore,
  canRestore,
  busy,
  parsedUploads = [],
}: {
  documents: VendorDocument[];
  files: File[];
  onUpload: (files: File[]) => void;
  onRemove: (id: string) => void;
  onView: (doc: VendorDocument) => void;
  onRestore: () => void;
  canRestore: boolean;
  busy: boolean;
  parsedUploads?: VendorDocument[];
}) {
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const total = documents.length + files.length;
  return (
    <section aria-label="Documents for review">
      <div className="doc-grid">
        {documents.map((d) => (
          <Card key={d.id} className="document-card">
            <CardHeader>
              <div className="document-top">
                <FileText size={20} />
                <Badge variant="secondary" className="doc-type">
                  {d.type}
                </Badge>
              </div>
              <CardTitle>
                <button className="document-name" onClick={() => onView(d)}>
                  {d.name}
                </button>
              </CardTitle>
              <CardDescription>
                {d.pages ? `${d.pages} pages · ` : ""}
                {d.wordCount.toLocaleString("en-GB")} words
              </CardDescription>
            </CardHeader>
            <Button
              className="doc-remove"
              variant="ghost"
              size="icon-xs"
              aria-label={`Remove ${d.name} from review`}
              disabled={busy}
              onClick={() => onRemove(d.id)}
            >
              <X />
            </Button>
          </Card>
        ))}
        {files.map((f, i) => (
          <Card key={`${f.name}-${i}`} className="document-card">
            <CardHeader>
              <div className="document-top">
                <FileText size={20} />
                <Badge variant="secondary" className="doc-type">
                  Upload
                </Badge>
              </div>
              <CardTitle>{f.name}</CardTitle>
              <CardDescription>
                {parsedUploads[i]
                  ? `${parsedUploads[i].pages ? `${parsedUploads[i].pages} pages · ` : ""}${parsedUploads[i].wordCount.toLocaleString("en-GB")} words`
                  : `${Math.round(f.size / 1024)} KB · Ready to parse`}
              </CardDescription>
            </CardHeader>
            <Button
              className="doc-remove"
              variant="ghost"
              size="icon-xs"
              aria-label={`Remove ${f.name} from review`}
              disabled={busy}
              onClick={() => onRemove(`file-${i}`)}
            >
              <X />
            </Button>
          </Card>
        ))}
      </div>
      {total === 0 && (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FolderOpen />
            </EmptyMedia>
            <EmptyTitle>No documents yet</EmptyTitle>
            <EmptyDescription>
              Drag in a questionnaire or try a sample vendor.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button variant="outline" onClick={() => input.current?.click()}>
              Browse files
            </Button>
          </EmptyContent>
        </Empty>
      )}
      <div
        className={cn("upload-zone", dragging && "dragging")}
        onDragOver={(e) => {
          e.preventDefault();
          if (!busy) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (!busy) onUpload([...e.dataTransfer.files]);
        }}
      >
        <Upload size={16} />
        <span>Drop PDF, Markdown or TXT here</span>
        <span>·</span>
        <button
          disabled={busy || total >= 5}
          onClick={() => input.current?.click()}
        >
          Browse files
        </button>
        <small>10 MB per file · {total}/5 documents</small>
        {canRestore && (
          <button disabled={busy} onClick={onRestore}>
            Restore sample docs
          </button>
        )}
        <input
          aria-label="Upload documents"
          className="sr-only"
          ref={input}
          type="file"
          accept=".pdf,.md,.txt"
          multiple
          disabled={busy}
          onChange={(e) => {
            if (e.target.files) onUpload([...e.target.files]);
            e.target.value = "";
          }}
        />
      </div>
    </section>
  );
}
