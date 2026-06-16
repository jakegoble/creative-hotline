/**
 * POST /api/library/upload?sessionId=<id>
 *
 * Uploads a client-library file (a doc M+J add at any stage) to Vercel Blob and
 * returns its public URL + name. The Morning Prep "Library" section calls this,
 * then records { label, url, source:'M+J', addedAt } in the prep blob — so the
 * uploaded doc becomes a primary input and feeds the next regenerate.
 *
 * Multipart body: form field `file` (the upload). Optional `label`.
 *
 * Storage: Vercel Blob. Requires a Blob store on the project (env
 * BLOB_READ_WRITE_TOKEN, auto-injected once a store is created in the Vercel
 * dashboard). If it isn't configured yet, this returns 501 with a clear message
 * and the Library UI falls back to link-only (paste a Drive/Notion/Figma link).
 */

import { NextResponse } from "next/server";
import { put } from "@vercel/blob";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Keep uploads sane — 25 MB ceiling, common doc/image types.
const MAX_BYTES = 25 * 1024 * 1024;

export async function POST(request: Request) {
  const url = new URL(request.url);
  const sessionId = url.searchParams.get("sessionId") || "unscoped";

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      {
        error: "storage_not_configured",
        message:
          "File storage isn't set up yet. Create a Vercel Blob store (Storage → Create → Blob) — BLOB_READ_WRITE_TOKEN is then auto-added. Until then, paste a link instead.",
      },
      { status: 501 },
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "invalid_form_data" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "missing_file" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "file_too_large", message: "Max 25 MB." },
      { status: 413 },
    );
  }

  const label = (form.get("label") as string | null)?.trim() || file.name;
  // Namespace by session so a client's docs stay grouped + don't collide.
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const pathname = `client-library/${sessionId}/${Date.now()}-${safeName}`;

  try {
    const blob = await put(pathname, file, {
      access: "public",
      addRandomSuffix: false,
    });
    return NextResponse.json({
      ok: true,
      url: blob.url,
      name: label,
      contentType: file.type || "application/octet-stream",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "upload_failed";
    console.error(`[library/upload] failed: ${message}`);
    return NextResponse.json({ error: "upload_failed", message }, { status: 500 });
  }
}
