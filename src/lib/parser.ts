import { extractText } from "unpdf";
import { DocumentSchema, type VendorDocument } from "./schema";
export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_DOCUMENTS = 5;
export const MAX_TEXT_CHARS = 180_000;
export class IntakeError extends Error {}
export function splitSections(text: string) {
  const anchors: VendorDocument["anchors"] = [];
  const lines = text.split(/\r?\n/);
  let location = "Document start";
  let buffer: string[] = [];
  for (const line of lines) {
    const heading = line.match(/^#{1,6}\s+(.+)$/);
    if (heading) {
      if (buffer.join("\n").trim())
        anchors.push({ location, text: buffer.join("\n").trim() });
      location = heading[1];
      buffer = [line];
    } else buffer.push(line);
  }
  if (buffer.join("\n").trim())
    anchors.push({ location, text: buffer.join("\n").trim() });
  return anchors;
}
export async function parseDocument(
  bytes: Uint8Array,
  meta: {
    id: string;
    name: string;
    type: VendorDocument["type"];
    source: VendorDocument["source"];
    filename?: string;
  },
): Promise<VendorDocument> {
  const filename = meta.filename ?? meta.name;
  if (bytes.byteLength > MAX_FILE_BYTES)
    throw new IntakeError(
      `${filename} is too large. Choose a file under 10 MB.`,
    );
  if (!/\.(pdf|md|txt)$/i.test(filename))
    throw new IntakeError(
      "Choose a PDF, Markdown (.md) or text (.txt) document.",
    );
  let text: string,
    pages: number | undefined,
    anchors: VendorDocument["anchors"];
  if (/\.pdf$/i.test(filename)) {
    try {
      const result = await extractText(new Uint8Array(bytes), {
        mergePages: false,
      });
      pages = result.totalPages;
      anchors = result.text.map((text, i) => ({
        location: `Page ${i + 1}`,
        text,
      }));
      text = anchors.map((x) => x.text).join("\n\n");
    } catch {
      throw new IntakeError(
        `We couldn't read ${filename}. Try an unlocked, text-based PDF or export it as Markdown.`,
      );
    }
    if (text.replace(/\s/g, " ").trim().length < 30)
      throw new IntakeError(
        `${filename} appears to be an image-only PDF. OCR isn't included yet; use a text-based PDF, Markdown or TXT file.`,
      );
  } else {
    text = new TextDecoder("utf-8", { fatal: false })
      .decode(bytes)
      .replace(/\u0000/g, "");
    anchors = splitSections(text);
  }
  if (!text.trim())
    throw new IntakeError(
      `${filename} has no readable text. Please choose a document with content.`,
    );
  if (text.length > MAX_TEXT_CHARS)
    throw new IntakeError(
      `${filename} contains too much text for this review. Split it into a shorter document.`,
    );
  return DocumentSchema.parse({
    id: meta.id,
    name: meta.name,
    type: meta.type,
    source: meta.source,
    text,
    anchors,
    pages,
    wordCount: text.trim().split(/\s+/).length,
  });
}
