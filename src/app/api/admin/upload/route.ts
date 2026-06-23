import { NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabase";
import { verifyAdmin } from "@/lib/admin-auth";

// Admin-only file upload to Supabase Storage.
//
// Buckets:
//   - "product-images" — product images AND product PDFs (pdf_url, brochure_pdf)
//   - "blog-images"    — blog post images (and PDFs if ever needed)
//
// Both buckets are public-read. We use the service-role client (bypasses RLS)
// so uploads work regardless of the bucket's INSERT policy.
//
// POST   multipart/form-data: { file: File, bucket: "product-images"|"blog-images" }
//   → 200 { ok: true, filename, url }
//   → 400 (missing file / invalid bucket / invalid type)
//   → 413 (too large, max 10 MB)
//   → 401 (not admin)
//
// DELETE ?bucket=...&filename=...
//   → 200 { ok: true }

const ALLOWED_BUCKETS = ["product-images", "blog-images"] as const;
type Bucket = (typeof ALLOWED_BUCKETS)[number];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

// Extension → MIME type (used both for validation and for setting the
// storage object's content-type). We trust the extension over the
// browser-supplied `file.type` because some browsers (and all `fetch`
// polyfills) report `application/octet-stream` for non-image files.
const ALLOWED_EXTENSIONS: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  pdf: "application/pdf",
};

function getClient() {
  try {
    return getServerClient();
  } catch {
    return null;
  }
}

function extOf(name: string): string {
  const lastDot = name.lastIndexOf(".");
  return lastDot > 0 ? name.slice(lastDot + 1).toLowerCase() : "";
}

// Sanitize a user-supplied filename:
//   - strip accents (NFD + remove combining marks)
//   - lowercase
//   - replace non-[a-z0-9] runs with a single hyphen
//   - trim leading/trailing hyphens
//   - cap base name at 60 chars
//   - keep the extension (cleaned, max 8 chars)
function sanitizeFilename(name: string): string {
  const lastDot = name.lastIndexOf(".");
  const base = lastDot > 0 ? name.slice(0, lastDot) : name;
  const ext = lastDot > 0 ? name.slice(lastDot + 1).toLowerCase() : "";
  const sanitizedBase =
    base
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "file";
  const sanitizedExt = ext.replace(/[^a-z0-9]/g, "").slice(0, 8);
  return sanitizedExt ? `${sanitizedBase}.${sanitizedExt}` : sanitizedBase;
}

// POST: upload a file to a Supabase Storage bucket (admin only).
export async function POST(request: NextRequest) {
  if (!verifyAdmin(request)) {
    return NextResponse.json(
      { error: "Non autorisé. Session admin requise." },
      { status: 401 }
    );
  }
  const client = getClient();
  if (!client) {
    return NextResponse.json(
      {
        error:
          "Supabase serveur non configuré. Vérifiez SUPABASE_SERVICE_ROLE_KEY.",
      },
      { status: 500 }
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "FormData invalide." }, { status: 400 });
  }

  const file = formData.get("file");
  const bucket = formData.get("bucket");

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Fichier manquant. Champ 'file' requis." },
      { status: 400 }
    );
  }
  if (
    typeof bucket !== "string" ||
    !ALLOWED_BUCKETS.includes(bucket as Bucket)
  ) {
    return NextResponse.json(
      {
        error:
          "Bucket invalide. Attendu : 'product-images' ou 'blog-images'.",
      },
      { status: 400 }
    );
  }

  // Size check (10 MB).
  if (file.size === 0) {
    return NextResponse.json({ error: "Fichier vide." }, { status: 400 });
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "Fichier trop volumineux. Taille maximale : 10 Mo." },
      { status: 413 }
    );
  }

  // Type check — accept PNG/JPG/JPEG/WEBP/GIF/PDF by extension. We also
  // tolerate browsers that send a generic `application/octet-stream` MIME
  // for PDFs (e.g. some Android WebViews) by trusting the extension.
  const ext = extOf(file.name);
  if (!(ext in ALLOWED_EXTENSIONS)) {
    return NextResponse.json(
      {
        error:
          "Type de fichier non autorisé. Formats acceptés : PNG, JPG, JPEG, WEBP, GIF, PDF.",
      },
      { status: 400 }
    );
  }

  const sanitized = sanitizeFilename(file.name);
  const uniqueName = `${Date.now()}-${sanitized}`;
  const contentType =
    ALLOWED_EXTENSIONS[ext] || file.type || "application/octet-stream";

  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error } = await client
      .storage.from(bucket as Bucket)
      .upload(uniqueName, buffer, {
        contentType,
        upsert: true,
      });

    if (error) {
      console.error("[admin/upload] storage error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const url = `${supabaseUrl}/storage/v1/object/public/${bucket}/${uniqueName}`;

    return NextResponse.json({ ok: true, filename: uniqueName, url });
  } catch (e: any) {
    console.error("[admin/upload] exception:", e);
    return NextResponse.json(
      { error: e?.message || "Erreur lors du téléversement." },
      { status: 500 }
    );
  }
}

// DELETE: remove a file from a Supabase Storage bucket (admin only).
// Query params: ?bucket=...&filename=...
export async function DELETE(request: NextRequest) {
  if (!verifyAdmin(request)) {
    return NextResponse.json(
      { error: "Non autorisé. Session admin requise." },
      { status: 401 }
    );
  }
  const client = getClient();
  if (!client) {
    return NextResponse.json(
      {
        error:
          "Supabase serveur non configuré. Vérifiez SUPABASE_SERVICE_ROLE_KEY.",
      },
      { status: 500 }
    );
  }

  const url = new URL(request.url);
  const bucket = url.searchParams.get("bucket");
  const filename = url.searchParams.get("filename");

  if (!bucket || !ALLOWED_BUCKETS.includes(bucket as Bucket)) {
    return NextResponse.json({ error: "Bucket invalide." }, { status: 400 });
  }
  if (!filename) {
    return NextResponse.json(
      { error: "Param 'filename' requis." },
      { status: 400 }
    );
  }

  // Path traversal guard — filenames are flat (we generate them server-side
  // with `${Date.now()}-${sanitized}` so this should never trigger, but
  // rejecting here is cheap insurance).
  if (filename.includes("/") || filename.includes("..")) {
    return NextResponse.json(
      { error: "Nom de fichier invalide." },
      { status: 400 }
    );
  }

  try {
    const { error } = await client
      .storage.from(bucket as Bucket)
      .remove([filename]);
    if (error) {
      console.error("[admin/upload] delete error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[admin/upload] delete exception:", e);
    return NextResponse.json(
      { error: e?.message || "Erreur lors de la suppression." },
      { status: 500 }
    );
  }
}
