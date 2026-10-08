import type { Evidence, VendorDocument, VerifiedEvidence } from "./schema";
export function normalize(text: string) {
  return text
    .normalize("NFKC")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[‐‑–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}
function oneTypo(a: string, b: string) {
  if (a === b) return true;
  // Never fuzz numbers, short words or negation: a changed control must not verify.
  if (
    /\d/.test(a + b) ||
    Math.min(a.length, b.length) < 6 ||
    Math.abs(a.length - b.length) > 1
  )
    return false;
  let i = 0,
    j = 0,
    edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++;
      j++;
    } else {
      edits++;
      if (edits > 1) return false;
      if (a.length >= b.length) i++;
      if (b.length >= a.length) j++;
    }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}
export function findQuote(
  text: string,
  quote: string,
): { match: VerifiedEvidence["match"]; sourceQuote: string } | null {
  const exact = text.indexOf(quote);
  if (exact >= 0)
    return {
      match: "exact",
      sourceQuote: text.slice(exact, exact + quote.length),
    };
  const normalized = normalize(text),
    needle = normalize(quote);
  if (!needle || needle.length < 8) return null;
  // Map normalized token windows back to the original text for the viewer highlight.
  const sourceTokens = [...text.matchAll(/\S+/g)];
  const queryTokens = quote.match(/\S+/g) ?? [];
  if (normalized.includes(needle)) {
    for (
      let start = 0;
      start <= sourceTokens.length - queryTokens.length;
      start++
    ) {
      const from = sourceTokens[start].index!;
      const last = sourceTokens[start + queryTokens.length - 1];
      const passage = text.slice(from, last.index! + last[0].length);
      if (normalize(passage) === needle)
        return { match: "normalized", sourceQuote: passage };
    }
  }
  if (queryTokens.length < 6) return null;
  for (
    let start = 0;
    start <= sourceTokens.length - queryTokens.length;
    start++
  ) {
    let edits = 0,
      ok = true;
    for (let i = 0; i < queryTokens.length; i++) {
      const a = normalize(sourceTokens[start + i][0]),
        b = normalize(queryTokens[i]);
      if (a !== b) {
        if (!oneTypo(a, b) || ++edits > 1) {
          ok = false;
          break;
        }
      }
    }
    if (ok) {
      const last = sourceTokens[start + queryTokens.length - 1];
      return {
        match: edits ? "fuzzy" : "normalized",
        sourceQuote: text.slice(
          sourceTokens[start].index!,
          last.index! + last[0].length,
        ),
      };
    }
  }
  return null;
}
export function verifyCitation(
  evidence: Evidence,
  documents: VendorDocument[],
): VerifiedEvidence {
  const doc = documents.find((d) => d.id === evidence.docId);
  if (!doc) return { ...evidence, verified: false, match: "unverified" };
  for (const anchor of doc.anchors) {
    const match = findQuote(anchor.text, evidence.quote);
    if (match)
      return {
        ...evidence,
        verified: true,
        match: match.match,
        matchedQuote: match.sourceQuote,
        matchedLocation: anchor.location,
      };
  }
  return { ...evidence, verified: false, match: "unverified" };
}
