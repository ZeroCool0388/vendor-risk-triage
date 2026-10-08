"use client";
import { useState, useEffect, useCallback } from "react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import {
  GitFork as Github,
  Moon,
  Sun,
  ChevronRight,
  Layers,
  Play,
  Download,
  Clock3,
  ArrowRight,
  Info,
  AlertCircle,
  LoaderCircle,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldDescription,
} from "@/components/ui/field";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyMedia,
} from "@/components/ui/empty";
import {
  AssessmentSchema,
  type WorkspaceVendor,
  type Mode,
  type Assessment,
  type AssessedFinding,
} from "@/lib/schema";
import { timeEstimate } from "@/lib/scoring";
import {
  overrideKey,
  applyOverrides,
  serializeOverrides,
} from "@/lib/overrides";
import { Sidebar } from "./sidebar";
import { Documents } from "./documents";
import { Overview } from "./overview";
import { FindingsTable } from "./findings-table";
import { FindingDrawer } from "./finding-drawer";
import { DocumentViewer, type ViewerSelection } from "./document-viewer";
import { FollowUps } from "./follow-ups";
import { ExportDialog } from "./export-dialog";
import { TriageProgress } from "./triage-progress";
function readSaved(assessment: Assessment) {
  try {
    return applyOverrides(
      assessment,
      localStorage.getItem(overrideKey(assessment)),
    );
  } catch {
    return assessment;
  }
}
export function Workspace({
  initialVendors,
  configuredMode,
}: {
  initialVendors: WorkspaceVendor[];
  configuredMode: Mode;
}) {
  const [vendors, setVendors] = useState(initialVendors);
  const [selected, setSelected] = useState(initialVendors[0].slug);
  const [newOpen, setNewOpen] = useState(false);
  const [assessed, setAssessed] = useState(new Set<string>());
  const [name, setName] = useState("");
  const [sector, setSector] = useState("");

  function newVendor(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const slug = `custom-${crypto.randomUUID()}`;
    setVendors((v) => [
      ...v,
      {
        slug,
        name: name.trim(),
        sector: sector.trim() || "New vendor",
        contactName: "Vendor team",
        contactEmail: "vendor@fictional.example",
        documents: [],
        parsedDocuments: [],
        preview: null,
      },
    ]);
    setSelected(slug);
    setNewOpen(false);
    setName("");
    setSector("");
    toast.success("New vendor workspace created.");
  }
  return (
    <div className="app-shell">
      <a href={`#workspace-${selected}`} className="skip-link">
        Skip to workspace
      </a>
      <Sidebar
        vendors={vendors}
        selected={selected}
        onSelect={setSelected}
        onNew={() => setNewOpen(true)}
        assessed={assessed}
      />
      {vendors.map((vendor) => (
        <div key={vendor.slug} hidden={vendor.slug !== selected}>
          <VendorWorkspace
            vendor={vendor}
            configuredMode={configuredMode}
            onAssessed={() => setAssessed((s) => new Set([...s, vendor.slug]))}
          />
        </div>
      ))}
      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New vendor</DialogTitle>
            <DialogDescription>
              Start a review with fictional sample documents. This workspace
              lasts for this session.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={newVendor}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="vendor-name">Vendor name</FieldLabel>
                <Input
                  id="vendor-name"
                  required
                  maxLength={120}
                  placeholder="Fictional company Ltd"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="vendor-sector">Sector</FieldLabel>
                <Input
                  id="vendor-sector"
                  maxLength={100}
                  placeholder="e.g. Cloud software"
                  value={sector}
                  onChange={(e) => setSector(e.target.value)}
                />
                <FieldDescription>
                  Use synthetic documents and fictional contacts only.
                </FieldDescription>
              </Field>
              <Button type="submit">Create workspace</Button>
            </FieldGroup>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
function VendorWorkspace({
  vendor,
  configuredMode,
  onAssessed,
}: {
  vendor: WorkspaceVendor;
  configuredMode: Mode;
  onAssessed: (a: Assessment) => void;
}) {
  const [documents, setDocuments] = useState(vendor.parsedDocuments);
  const [files, setFiles] = useState<File[]>([]);
  const [assessment, setAssessment] = useState<Assessment | null>(
    vendor.preview,
  );
  const [isSample, setIsSample] = useState(!!vendor.preview);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(0);
  const [tab, setTab] = useState("assessment");
  const [error, setError] = useState<{
    message: string;
    canUseDemo: boolean;
  } | null>(null);
  const [findingId, setFindingId] = useState<string | null>(null);
  const [viewer, setViewer] = useState<ViewerSelection | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();
  useEffect(() => {
    // Restore user-owned browser state after hydration; never send notes to the server.
    if (vendor.preview) {
      const saved = readSaved(vendor.preview);
      queueMicrotask(() => setAssessment(saved));
    }
  }, [vendor.preview]);
  const totalWords = (assessment?.documents ?? documents).reduce(
    (n, d) => n + d.wordCount,
    0,
  );
  const time = timeEstimate(totalWords);
  const displayMode =
    !isSample && assessment ? assessment.mode : configuredMode;
  function save(next: Assessment) {
    setAssessment(next);
    try {
      localStorage.setItem(overrideKey(next), serializeOverrides(next));
    } catch {
      toast.warning(
        "Browser storage is unavailable. Your edits will last for this session.",
      );
    }
  }
  const openFinding = useCallback((id: string) => setFindingId(id), []);
  function changeFinding(
    id: string,
    patch: Partial<Pick<AssessedFinding, "severity" | "status" | "note">>,
  ) {
    if (assessment)
      save({
        ...assessment,
        findings: assessment.findings.map((f) =>
          f.id === id ? { ...f, ...patch } : f,
        ),
      });
  }
  function editQuestion(id: string, question: string) {
    if (assessment)
      save({
        ...assessment,
        followUps: assessment.followUps.map((q) =>
          q.findingId === id ? { ...q, question } : q,
        ),
      });
  }
  function upload(incoming: File[]) {
    const valid: File[] = [];
    for (const file of incoming) {
      if (!/\.(pdf|md|txt)$/i.test(file.name)) {
        toast.error(`${file.name}: choose PDF, Markdown or TXT.`);
        continue;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name}: choose a file under 10 MB.`);
        continue;
      }
      if (file.size === 0) {
        toast.error(`${file.name} is empty.`);
        continue;
      }
      valid.push(file);
    }
    if (files.length + documents.length + valid.length > 5) {
      toast.error(
        "A vendor review can contain up to five files. Remove a document before adding more.",
      );
      return;
    }
    if (valid.length) {
      setFiles((f) => [...f, ...valid]);
      setAssessment(null);
      setError(null);
      toast.success(
        `${valid.length} document${valid.length === 1 ? "" : "s"} added. Run triage to review.`,
      );
    }
  }
  function remove(id: string) {
    if (id.startsWith("file-"))
      setFiles((f) => f.filter((_, i) => i !== Number(id.slice(5))));
    else setDocuments((d) => d.filter((x) => x.id !== id));
    setAssessment(null);
    setError(null);
  }
  async function run(forceDemo = false) {
    if (busy) return;
    setBusy(true);
    setStep(0);
    setError(null);
    setTab("assessment");
    const interval = setInterval(() => setStep((s) => Math.min(3, s + 1)), 650);
    const started = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60_000);
    try {
      const form = new FormData();
      form.set("vendorSlug", vendor.slug);
      form.set("vendorName", vendor.name);
      form.set(
        "docIds",
        JSON.stringify(
          documents.filter((d) => d.source === "seeded").map((d) => d.id),
        ),
      );
      form.set("forceDemo", String(forceDemo));
      files.forEach((f) => form.append("files", f));
      const response = await fetch("/api/triage", {
        method: "POST",
        body: form,
        signal: controller.signal,
      });
      let payload;
      try {
        payload = await response.json();
      } catch {
        throw new Error(
          response.status === 413
            ? "The hosting service couldn't accept this upload. Try fewer or smaller files."
            : "The server couldn't return a review. Please retry.",
        );
      }
      if (!response.ok || !payload.ok) {
        setError(
          payload.error ?? {
            message: "This review could not be completed.",
            canUseDemo: displayMode.kind === "live",
          },
        );
        return;
      }
      const parsed = AssessmentSchema.parse(payload.assessment);
      const next = readSaved(parsed);
      if (parsed.mode.kind !== "live")
        await new Promise((resolve) =>
          setTimeout(resolve, Math.max(0, 2600 - (Date.now() - started))),
        );
      setAssessment(next);
      setIsSample(false);
      onAssessed(next);
      toast.success("Assessment ready. Review the evidence and next steps.");
    } catch (e) {
      setError({
        message:
          e instanceof Error && e.name === "AbortError"
            ? "This review took too long. Try again or use demo mode."
            : e instanceof Error
              ? e.message
              : "The review could not be completed. Please retry.",
        canUseDemo: configuredMode.kind === "live",
      });
    } finally {
      clearInterval(interval);
      clearTimeout(timeout);
      setBusy(false);
    }
  }
  return (
    <div className="main-shell">
      <header className="topbar">
        <div className="breadcrumbs">
          <Layers size={14} />
          <span>Workspace</span>
          <ChevronRight size={12} />
          <strong>{vendor.name.replace(" Ltd", "")}</strong>
        </div>
        <div className="topbar-actions">
          <Badge variant="outline" className="mode-badge">
            <span className="size-1.5 rounded-full bg-primary" />
            {displayMode.label}
          </Badge>
          <Button size="icon-sm" variant="ghost" asChild>
            <a
              href="https://github.com/ZeroCool0388"
              target="_blank"
              rel="noreferrer"
              aria-label="Steve Grady on GitHub"
            >
              <Github />
            </a>
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label="Toggle dark mode"
            onClick={() =>
              setTheme(resolvedTheme === "dark" ? "light" : "dark")
            }
          >
            <Sun className="hidden dark:block" />
            <Moon className="dark:hidden" />
          </Button>
        </div>
      </header>
      <main id={`workspace-${vendor.slug}`} className="workspace-main">
        <div className="page-header">
          <div>
            <h1 className="page-title">{vendor.name}</h1>
            <p className="page-subtitle">{vendor.sector}</p>
          </div>
          <div className="header-actions">
            <Button
              variant="outline"
              size="lg"
              disabled={!assessment || busy}
              onClick={() => setExportOpen(true)}
            >
              <Download data-icon="inline-start" />
              Export report
            </Button>
            <Button
              size="lg"
              disabled={busy || documents.length + files.length === 0}
              onClick={() => run()}
            >
              {busy ? (
                <LoaderCircle
                  className="animate-spin"
                  data-icon="inline-start"
                />
              ) : (
                <Play data-icon="inline-start" />
              )}
              {busy ? "Running triage…" : "Run triage"}
            </Button>
          </div>
        </div>
        <div className="time-strip">
          <div className="time-primary">
            <Clock3 size={16} />
            <span>
              Manual review est.{" "}
              <strong>{totalWords ? `~${time.hours} hrs` : "—"}</strong>
            </span>
            <ArrowRight size={14} />
            <strong>
              AI triage{" "}
              {totalWords ? `~${time.triageSeconds} sec` : "under a minute"}
            </strong>
          </div>
          <span
            className="time-caption"
            title="Manual estimate: words ÷ 4 minutes. AI estimate: 15 + words ÷ 52 seconds, capped at 55. Not measured performance."
          >
            Based on document volume · estimate
          </span>
        </div>
        <Documents
          documents={documents}
          files={files}
          onUpload={upload}
          onRemove={remove}
          onView={(doc) => setViewer({ doc })}
          onRestore={() => {
            setDocuments(vendor.parsedDocuments);
            setFiles([]);
            setAssessment(vendor.preview ? readSaved(vendor.preview) : null);
            setIsSample(true);
            setError(null);
          }}
          canRestore={documents.length < vendor.parsedDocuments.length}
          busy={busy}
          parsedUploads={assessment?.documents.filter(
            (d) => d.source === "upload",
          )}
        />
        {error && (
          <Alert variant="destructive" className="app-alert" role="alert">
            <AlertCircle />
            <AlertTitle>Review could not be completed</AlertTitle>
            <AlertDescription>
              <p>{error.message}</p>
              <div className="flex gap-2 mt-3">
                <Button variant="outline" size="sm" onClick={() => run()}>
                  Retry triage
                </Button>
                {error.canUseDemo && (
                  <Button size="sm" onClick={() => run(true)}>
                    Run in demo mode instead
                  </Button>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}
        {busy ? (
          <TriageProgress step={step} />
        ) : assessment ? (
          <>
            <p className="source-note">
              <Info size={12} />
              {isSample
                ? "Sample assessment · Run triage to refresh from the documents"
                : "Assessment completed · " + assessment.mode.label}
              {isSample && configuredMode.kind === "live"
                ? " · Next run uses the configured live provider"
                : ""}
            </p>
            <Tabs
              className="assessment-tabs"
              value={tab}
              onValueChange={setTab}
            >
              <TabsList>
                <TabsTrigger value="assessment">
                  Assessment
                  <span className="tab-count">
                    {assessment.findings.length}
                  </span>
                </TabsTrigger>
                <TabsTrigger value="followups">
                  Follow-up questions
                  <span className="tab-count">
                    {assessment.followUps.length}
                  </span>
                </TabsTrigger>
              </TabsList>
              <TabsContent value="assessment">
                <Overview assessment={assessment} />
                <FindingsTable
                  findings={assessment.findings}
                  onOpen={openFinding}
                />
              </TabsContent>
              <TabsContent value="followups">
                <FollowUps
                  assessment={assessment}
                  contactName={vendor.contactName}
                  onEdit={editQuestion}
                  onOpen={openFinding}
                />
              </TabsContent>
            </Tabs>
          </>
        ) : documents.length + files.length > 0 ? (
          <Empty className="ready-state">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ShieldCheck />
              </EmptyMedia>
              <EmptyTitle>Your documents are ready.</EmptyTitle>
              <EmptyDescription>
                Run triage for cited findings, a transparent score and practical
                follow-up questions.
              </EmptyDescription>
            </EmptyHeader>
            <Button onClick={() => run()}>
              <Play data-icon="inline-start" />
              Run triage
            </Button>
          </Empty>
        ) : null}
        <footer className="workspace-footer">
          <span>Evidence first. Decisions faster.</span>
          <span>Synthetic demo data · Analyst review required</span>
        </footer>
      </main>
      <FindingDrawer
        finding={assessment?.findings.find((f) => f.id === findingId) ?? null}
        documents={assessment?.documents ?? documents}
        onClose={() => setFindingId(null)}
        onChange={changeFinding}
        onView={(doc, evidence) => setViewer({ doc, evidence })}
      />
      <DocumentViewer selection={viewer} onClose={() => setViewer(null)} />
      <ExportDialog
        assessment={assessment}
        open={exportOpen}
        onClose={() => setExportOpen(false)}
      />
    </div>
  );
}
