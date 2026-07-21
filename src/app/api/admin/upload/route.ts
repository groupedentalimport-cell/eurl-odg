import { NextRequest, NextResponse } from "next/server";
import { getServerClientOr500 } from "@/lib/supabase/server";
import { requireRole } from "@/lib/admin-auth";
import { PERMISSIONS } from "@/lib/auth/permissions";

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

    if (!file) {
      return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 });
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "Fichier trop volumineux (max 10 Mo)" }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "Type de fichier non autorisé" }, { status: 400 });
    }

    // Generate unique filename
    const ext = file.name.split(".").pop() || "bin";
    const timestamp = Date.now();
    const random = Math.random().toString(36).slice(2, 8);
    const filename = `${timestamp}-${random}.${ext}`;
    const bucket = "odg-uploads";
    const path = `admin/${filename}`;

    // Convert File to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    // Upload to Supabase Storage
    const { data, error } = await client.storage
      .from(bucket)
      .upload(path, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (error) {
      // If bucket doesn't exist, try to create it
      if (error.message?.includes("not found") || error.message?.includes("does not exist")) {
        const { error: createError } = await client.storage.createBucket(bucket, {
          public: true,
          fileSizeLimit: 10 * 1024 * 1024,
        });
        if (createError) {
          return NextResponse.json(
            { error: `Impossible de créer le bucket: ${createError.message}` },
            { status: 500 }
          );
        }
        // Retry upload
        const { data: retryData, error: retryError } = await client.storage
          .from(bucket)
          .upload(path, buffer, {
            contentType: file.type,
            upsert: false,
          });
        if (retryError) {
          return NextResponse.json({ error: retryError.message }, { status: 500 });
        }
        const { data: urlData } = client.storage.from(bucket).getPublicUrl(path);
        return NextResponse.json({ filename, url: urlData.publicUrl, path });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get public URL
    const { data: urlData } = client.storage.from(bucket).getPublicUrl(path);

    return NextResponse.json({
      filename,
      url: urlData.publicUrl,
      path: data?.path || path,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Erreur" }, { status: 500 });
  }
}
