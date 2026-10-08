import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  ExtractionSchema,
  VendorIndexSchema,
  type Vendor,
  type WorkspaceVendor,
} from "./schema";
import { IntakeError, parseDocument } from "./parser";
import { assembleAssessment } from "./assessment";
const dataRoot = path.join(process.cwd(), "data");
export async function loadVendorIndex() {
  return VendorIndexSchema.parse(
    JSON.parse(
      await readFile(path.join(dataRoot, "vendors", "index.json"), "utf8"),
    ),
  );
}
export async function loadSeedDocuments(
  vendor: Vendor,
  ids = vendor.documents.map((d) => d.id),
) {
  if (ids.length > 5 || new Set(ids).size !== ids.length)
    throw new IntakeError("Choose up to five different documents.");
  return Promise.all(
    ids.map(async (id) => {
      const meta = vendor.documents.find((d) => d.id === id);
      if (!meta)
        throw new IntakeError(
          "The selected document does not belong to this sample vendor.",
        );
      const bytes = await readFile(
        path.join(dataRoot, "vendors", vendor.slug, meta.file),
      );
      return parseDocument(bytes, {
        id: meta.id,
        name: meta.name,
        type: meta.type,
        source: "seeded",
        filename: meta.file,
      });
    }),
  );
}
export async function loadMock(slug: string) {
  const vendors = await loadVendorIndex();
  if (!vendors.some((v) => v.slug === slug))
    throw new Error("Unknown sample vendor.");
  return ExtractionSchema.parse(
    JSON.parse(
      await readFile(
        path.join(dataRoot, "mock-responses", `${slug}.json`),
        "utf8",
      ),
    ),
  );
}
export async function loadWorkspaces(): Promise<WorkspaceVendor[]> {
  const index = await loadVendorIndex();
  return Promise.all(
    index.map(async (vendor) => {
      const documents = await loadSeedDocuments(vendor);
      const preview = assembleAssessment(
        await loadMock(vendor.slug),
        documents,
        vendor,
        {
          kind: "demo",
          provider: "mock",
          model: "deterministic",
          label: "Demo mode: mock AI responses",
        },
        "2026-10-08T12:00:00.000Z",
      );
      return { ...vendor, parsedDocuments: documents, preview };
    }),
  );
}
