/**
 * Library document content extraction (for regenerate "consumes the delta").
 *
 * When M+J regenerate the brief after adding documents to the Client Library,
 * the regen should read what's actually IN those docs — not just their names.
 * This fetches each library doc URL and pulls out plain text, bounded so it
 * never blows up the generation prompt or hangs the request.
 *
 * Supported: text/plain, text/markdown, text/csv, application/json, text/html
 * (tags stripped), application/pdf (via unpdf — serverless-safe, no native
 * deps). Other binary types (docx, etc.) are noted but skipped — link them from
 * Drive/Notion instead, or paste the text. Fail-soft per-doc: one bad fetch
 * never breaks the regen.
 */

import { extractText, getDocumentProxy } from "unpdf";

export interface LibraryDocRef {
  label?: string;
  url?: string;
  source?: string;
}

const PER_DOC_CHARS = 8000; // cap each doc's contribution
const TOTAL_CHARS = 20000; // cap the whole appended block
const MAX_DOCS = 6;
const FETCH_TIMEOUT_MS = 25000; // larger client decks (multi-MB PDFs) need room to download on a cold function
const MAX_BYTES = 25 * 1024 * 1024;

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchWithTimeout(url: string): Promise<Response | null> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { signal: controller.signal, redirect: "follow" });
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

async function extractOne(doc: LibraryDocRef): Promise<string | null> {
  const url = (doc.url || "").trim();
  if (!/^https?:\/\//i.test(url)) return null; // only real fetchable links
  const res = await fetchWithTimeout(url);
  if (!res || !res.ok) return null;

  const ctype = (res.headers.get("content-type") || "").toLowerCase();
  const len = Number(res.headers.get("content-length") || 0);
  if (len && len > MAX_BYTES) return null;

  try {
    if (ctype.includes("application/pdf") || url.toLowerCase().endsWith(".pdf")) {
      const buf = new Uint8Array(await res.arrayBuffer());
      const pdf = await getDocumentProxy(buf);
      const { text } = await extractText(pdf, { mergePages: true });
      const joined = Array.isArray(text) ? text.join("\n") : String(text || "");
      return joined.slice(0, PER_DOC_CHARS);
    }
    if (
      ctype.includes("text/") ||
      ctype.includes("application/json") ||
      ctype.includes("application/xml")
    ) {
      const raw = await res.text();
      const cleaned = ctype.includes("text/html") ? stripHtml(raw) : raw;
      return cleaned.slice(0, PER_DOC_CHARS);
    }
    // Unknown/binary type (docx, images, etc.) — skip extraction, just note it.
    return null;
  } catch {
    return null;
  }
}

/**
 * Fetch + extract text from the given library docs, returning a single bounded
 * block to append to the regeneration prompt. Returns "" when nothing is
 * extractable. Newest docs are weighted first (callers pass them in add-order).
 */
export async function extractLibraryText(
  docs: LibraryDocRef[] | undefined,
): Promise<string> {
  if (!Array.isArray(docs) || docs.length === 0) return "";
  const slice = docs.slice(-MAX_DOCS); // most-recent docs
  const out: string[] = [];
  let budget = TOTAL_CHARS;

  for (const doc of slice) {
    if (budget <= 0) break;
    const text = await extractOne(doc);
    if (!text) continue;
    const clipped = text.slice(0, budget).trim();
    if (!clipped) continue;
    out.push(`--- DOCUMENT: ${doc.label || doc.url} ---\n${clipped}`);
    budget -= clipped.length;
  }

  if (out.length === 0) return "";
  return `DOCUMENT CONTENTS (extracted from the client library — use the specifics):\n${out.join("\n\n")}`;
}
