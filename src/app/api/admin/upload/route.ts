import { NextRequest, NextResponse } from "next/server";
import { getServerClientOr500 } from "@/lib/supabase/server";
import { requireRole } from "@/lib/admin-auth";
import { PERMISSIONS } from "@/lib/auth/permissions";

const ALLOWED_BUCKETS = ["product-images", "blog-images", "odg-uploads"];
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"];

// POST /api/admin/upload — Upload a file to Supabase Storage
export async function POST(request: NextRequest) {
  if (!requireRole(request, PERMISSIONS.products)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { client, error: clientError } = getServerClientOr500();
  if (clientError) return clientError;

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const bucket = (formData.get("bucket") as string) || "product-images";

    if (!file) {
      return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "Fichier trop volumineux (max 10 Mo)" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Type de fichier non autorisé" }, { status: 400 });
    }

    // Validate bucket name
    const targetBucket = ALLOWED_BUCKETS.includes(bucket) ? bucket : "product-images";

    // Generate unique filename
    const ext = file.name.split(".").pop() || "bin";
    const timestamp = Date.now();
    const random = Math.random().toString(36).slice(2, 8);
    const filename = `${timestamp}-${random}.${ext}`;

    // Convert File to Uint8Array
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    // Try to upload to Supabase Storage
    let { data, error } = await client.storage
      .from(targetBucket)
      .upload(filename, buffer, {
        contentType: file.type,
        upsert: false,
      });

    // If bucket doesn't exist, create it and retry
    if (error && (error.message?.includes("not found") || error.message?.includes("does not exist") || error.statusCode === "404")) {
      const { error: createError } = await client.storage.createBucket(targetBucket, {
        public: true,
        fileSizeLimit: MAX_SIZE,
      });
      if (createError) {
        return NextResponse.json(
          { error: `Impossible de créer le bucket '${targetBucket}': ${createError.message}` },
          { status: 500 }
        );
      }
      // Retry upload
      const retry = await client.storage
        .from(targetBucket)
        .upload(filename, buffer, {
          contentType: file.type,
          upsert: false,
        });
      if (retry.error) {
        return NextResponse.json({ error: retry.error.message }, { status: 500 });
      }
      data = retry.data;
    } else if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get public URL
    const { data: urlData } = client.storage.from(targetBucket).getPublicUrl(filename);

    return NextResponse.json({
      ok: true,
      filename,
      url: urlData.publicUrl,
      path: data?.path || filename,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Erreur" }, { status: 500 });
  }
}
