import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { getServerClient } from "@/lib/supabase";

// Upload a file to Supabase Storage.
// Accepts FormData with:
//   - "file": the file to upload
//   - "bucket": the storage bucket name (e.g. "blog-images", "product-images")
// Returns { ok: true, filename, url } on success.

const ALLOWED_BUCKETS = ["blog-images", "product-images"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
];

export async function POST(request: NextRequest) {
  // Auth check
  const session = verifyAdmin(request);
  if (!session) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  // Parse FormData
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "FormData invalide" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  const bucket = formData.get("bucket") as string | null;

  if (!file) {
    return NextResponse.json({ error: "Fichier manquant" }, { status: 400 });
  }
  if (!bucket || !ALLOWED_BUCKETS.includes(bucket)) {
    return NextResponse.json(
      { error: `Bucket invalide. Autorisés: ${ALLOWED_BUCKETS.join(", ")}` },
      { status: 400 }
    );
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: `Fichier trop volumineux (max ${MAX_FILE_SIZE / 1024 / 1024} MB)` },
      { status: 400 }
    );
  }

  // Validate MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: `Type MIME non supporté: ${file.type}` },
      { status: 400 }
    );
  }

  // Get Supabase client (service role = bypasses RLS)
  let client;
  try {
    client = getServerClient();
  } catch {
    return NextResponse.json(
      { error: "Supabase non configuré" },
      { status: 500 }
    );
  }

  // Generate a unique filename to avoid collisions
  const ext = file.name.split(".").pop() || "jpg";
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).slice(2, 8);
  const filename = `${timestamp}-${randomSuffix}.${ext}`;

  // Read file as ArrayBuffer
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Upload to Supabase Storage
  const { data, error } = await client.storage
    .from(bucket)
    .upload(filename, buffer, {
      contentType: file.type,
      upsert: false,
      cacheControl: "3600",
    });

  if (error) {
    console.error("[admin/upload] Supabase storage error:", error);
    return NextResponse.json(
      { error: `Erreur Supabase Storage: ${error.message}` },
      { status: 500 }
    );
  }

  // Build the public URL
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const url = `${supabaseUrl}/storage/v1/object/public/${bucket}/${filename}`;

  return NextResponse.json({
    ok: true,
    filename,
    url,
  });
}
