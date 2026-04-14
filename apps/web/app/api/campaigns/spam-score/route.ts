import { NextRequest, NextResponse } from "next/server";
import { analyzeEmailSpamWithAI } from "@/lib/email-spam-score.server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { subject, htmlContent } = body;

    if (!subject && !htmlContent) {
      return NextResponse.json(
        { error: "No subject or content provided" },
        { status: 400 }
      );
    }

    const spamAnalysis = await analyzeEmailSpamWithAI({
      subject,
      htmlContent,
    });

    return NextResponse.json({ spamAnalysis });
  } catch (error) {
    console.error("Error in spam score API:", error);
    return NextResponse.json(
      {
        error: "Failed to analyze spam risk",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
