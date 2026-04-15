import { NextResponse } from "next/server";
import { uploadImageToS3 } from "@/lib/upload-image";
import { withWorkspace } from "@reachdem/auth/guards";

export const POST = withWorkspace(async ({ req, organizationId }) => {
  try {
    const contentType = req.headers.get("content-type");

    // Handle file upload
    if (contentType?.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File;

      if (!file) {
        return NextResponse.json(
          { error: "No file provided" },
          { status: 400 }
        );
      }

      // Validate file type
      if (!file.type.startsWith("image/")) {
        return NextResponse.json(
          { error: "File must be an image" },
          { status: 400 }
        );
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        return NextResponse.json(
          { error: "File size must be less than 5MB" },
          { status: 400 }
        );
      }

      const url = await uploadImageToS3(file);

      return NextResponse.json({ url });
    }

    return NextResponse.json(
      { error: "Invalid content type" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error in upload-image API:", error);
    return NextResponse.json(
      { error: "Failed to upload image" },
      { status: 500 }
    );
  }
});
