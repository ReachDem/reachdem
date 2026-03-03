import { NextRequest, NextResponse } from "next/server";
import {
  uploadToR2,
  generateProfilePhotoKey,
  generateOrgAvatarKey,
  validateImageFile,
} from "@/lib/r2";
import { requireAuth } from "@reachdem/auth";

/**
 * POST /api/upload
 * Upload a profile or organization avatar to R2
 * Protected: requires authenticated user
 */
export async function POST(request: NextRequest) {
  try {
    await requireAuth();

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "Aucun fichier fourni" },
        { status: 400 }
      );
    }

    // Validate file
    const validationError = validateImageFile(file.type, file.size);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    // Generate key and upload
    const mimeToExtension: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/jpg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "image/gif": "gif",
    };
    const extension = mimeToExtension[file.type] || "jpg";
    const uploadType = formData.get("type") as string | null;
    if (
      !uploadType ||
      (uploadType !== "user" && uploadType !== "organization")
    ) {
      return NextResponse.json(
        {
          error: "Type d'upload invalide (doit être 'user' ou 'organization')",
        },
        { status: 400 }
      );
    }

    const key =
      uploadType === "organization"
        ? generateOrgAvatarKey(extension)
        : generateProfilePhotoKey(extension);
    const buffer = Buffer.from(await file.arrayBuffer());

    const url = await uploadToR2(key, buffer, file.type);

    return NextResponse.json({
      success: true,
      url,
      key,
    });
  } catch (error) {
    if (error instanceof Response) return error;

    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'upload de l'image" },
      { status: 500 }
    );
  }
}
