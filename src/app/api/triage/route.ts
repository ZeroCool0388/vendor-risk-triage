import { NextResponse } from "next/server";
import { z } from "zod";
import { loadVendorIndex, loadSeedDocuments, loadMock } from "@/lib/vendors";
import { configuredMode, extractLive } from "@/lib/providers";
import {
  MAX_DOCUMENTS,
  MAX_FILE_BYTES,
  IntakeError,
  parseDocument,
} from "@/lib/parser";
import { extractRuleBased } from "@/lib/extractor";
import { assembleAssessment } from "@/lib/assessment";
import type { Mode, VendorDocument } from "@/lib/schema";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request: Request) {
  let liveAttempt = false;
  try {
    const declared = Number(request.headers.get("content-length") || 0);
    if (declared > MAX_FILE_BYTES * MAX_DOCUMENTS + 100_000)
      throw new IntakeError("Choose up to five files, each under 10 MB.");
    const form = await request.formData();
    const vendorSlug = z.string().min(1).max(100).parse(form.get("vendorSlug"));
    const vendorName = z.string().min(1).max(120).parse(form.get("vendorName"));
    const docIds = z
      .array(z.string().max(100))
      .max(5)
      .parse(JSON.parse(String(form.get("docIds") || "[]")));
    const files = form.getAll("files");
    if (files.some((f) => !(f instanceof File)))
      throw new IntakeError(
        "The upload could not be read. Please choose the files again.",
      );
    if (
      docIds.length + files.length > MAX_DOCUMENTS ||
      docIds.length + files.length < 1
    )
      throw new IntakeError(
        "Select between one and five documents for this review.",
      );
    const vendor = (await loadVendorIndex()).find((v) => v.slug === vendorSlug);
    if (docIds.length && !vendor)
      throw new IntakeError(
        "Choose a sample vendor before selecting sample documents.",
      );
    const documents: VendorDocument[] = vendor
      ? await loadSeedDocuments(vendor, docIds)
      : [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i] as File;
      if (file.size > MAX_FILE_BYTES)
        throw new IntakeError(
          `${file.name} is too large. Choose a file under 10 MB.`,
        );
      documents.push(
        await parseDocument(new Uint8Array(await file.arrayBuffer()), {
          id: `upload-${i + 1}`,
          name: file.name,
          type: /questionnaire/i.test(file.name)
            ? "Questionnaire"
            : /dpa/i.test(file.name)
              ? "DPA"
              : "Policy",
          source: "upload",
        }),
      );
    }
    if (documents.reduce((n, d) => n + d.text.length, 0) > 300_000)
      throw new IntakeError(
        "This review contains too much text. Select fewer or shorter documents.",
      );
    const forceDemo = form.get("forceDemo") === "true";
    let mode: Mode = forceDemo
      ? {
          kind: "demo",
          provider: "mock",
          model: "deterministic",
          label: "Demo mode: mock AI responses",
        }
      : configuredMode();
    const completeSeedPack =
      vendor &&
      files.length === 0 &&
      docIds.length === vendor.documents.length &&
      vendor.documents.every((d) => docIds.includes(d.id));
    let extraction;
    if (mode.kind === "live") {
      liveAttempt = true;
      extraction = await extractLive(
        documents,
        mode,
        AbortSignal.any([request.signal, AbortSignal.timeout(55_000)]),
      );
    } else if (completeSeedPack) {
      extraction = await loadMock(vendor.slug);
    } else {
      mode = {
        kind: "rule-based",
        provider: "rules",
        model: "keyword-v1",
        label: "Rule-based (demo mode)",
      };
      extraction = extractRuleBased(documents);
    }
    const assessment = assembleAssessment(
      extraction,
      documents,
      { slug: vendorSlug, name: vendor?.name ?? vendorName },
      mode,
    );
    return NextResponse.json(
      { ok: true, assessment },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const badInput =
      error instanceof IntakeError ||
      error instanceof z.ZodError ||
      error instanceof SyntaxError;
    // Provider details can contain credentials or request text: never return raw errors.
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: badInput
            ? "INVALID_DOCUMENTS"
            : liveAttempt
              ? "PROVIDER_FAILED"
              : "TRIAGE_FAILED",
          message: badInput
            ? error instanceof IntakeError
              ? error.message
              : "The review request is incomplete. Please reselect your documents and try again."
            : liveAttempt
              ? "The AI provider couldn't complete this review. Check the server's provider configuration, or run in demo mode instead."
              : "We couldn't complete this review. Please try again.",
          canRetry: true,
          canUseDemo: liveAttempt,
        },
      },
      { status: badInput ? 400 : liveAttempt ? 502 : 500 },
    );
  }
}
