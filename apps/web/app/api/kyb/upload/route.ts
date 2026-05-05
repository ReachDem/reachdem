import { NextRequest, NextResponse } from "next/server";
import { auth } from "@reachdem/auth";
import { uploadToR2 } from "@reachdem/core";
import { prisma } from "@reachdem/database";
import { nanoid } from "nanoid";
import {
  ALLOWED_KYB_DOC_TYPES,
  ALLOWED_KYB_IMAGE_TYPES,
} from "@/lib/server/kyb";

function getExtension(file: File) {
  const explicitExtension = file.name.split(".").pop()?.toLowerCase();

  if (explicitExtension) {
    return explicitExtension;
  }

  const mimeToExtension: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "application/pdf": "pdf",
  };

  return mimeToExtension[file.type] || "bin";
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { defaultOrganizationId: true },
    });

    const organizationId =
      session.session.activeOrganizationId ??
      user?.defaultOrganizationId ??
      null;

    if (!organizationId) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const docType = formData.get("docType");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }

    if (docType !== "id" && docType !== "business") {
      return NextResponse.json(
        { error: "Invalid KYB document type" },
        { status: 400 }
      );
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File is too large. Maximum size is 5MB." },
        { status: 400 }
      );
    }

    if (docType === "id" && !ALLOWED_KYB_IMAGE_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Identity document must be JPG, PNG, or WebP." },
        { status: 400 }
      );
    }

    if (docType === "business" && !ALLOWED_KYB_DOC_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Business document must be PDF, JPG, PNG, or WebP." },
        { status: 400 }
      );
    }

    const key = `kyb/${organizationId}/${docType}-${nanoid(12)}.${getExtension(file)}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    await uploadToR2(key, buffer, file.type);

    return NextResponse.json({ success: true, key });
  } catch (error) {
    console.error("KYB upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload KYB document" },
      { status: 500 }
    );
  }
}
