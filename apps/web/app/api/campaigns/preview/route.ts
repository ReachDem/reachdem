import { NextRequest, NextResponse } from "next/server";
import { wrapContentInEmailStructure } from "@/lib/render-email";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { content, previewText, fontFamily, fontWeights, htmlContent } = body;

    // If HTML content is provided, wrap it in email structure
    if (htmlContent) {
      const html = wrapContentInEmailStructure(
        htmlContent,
        fontFamily || "Inter",
        fontWeights || [400, 600, 700]
      );
      return NextResponse.json({ html });
    }

    // If JSON content is provided, we can't render it without the full Maily setup
    // For now, return an error
    if (content) {
      return NextResponse.json(
        {
          error:
            "JSON content rendering not yet implemented. Please provide htmlContent.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: "No content provided" }, { status: 400 });
  } catch (error) {
    console.error("Error in preview API:", error);
    return NextResponse.json(
      {
        error: "Failed to generate preview",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
