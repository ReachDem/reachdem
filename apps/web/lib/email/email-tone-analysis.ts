import { generateObject } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { z } from "zod";
import type {
  AnalyzeEmailSpamInput,
  EmailToneAnalysis,
} from "@/lib/email/email-spam-score";

const toneAnalysisSchema = z.object({
  risk: z.enum(["low", "medium", "high"]),
  scoreImpact: z.number().min(0).max(20),
  summary: z.string().min(1).max(220),
  problematicPatterns: z.array(z.string().min(1).max(80)).max(4),
  recommendation: z.string().min(1).max(180),
  confidence: z.number().min(0).max(1),
});

const EMAIL_TONE_ANALYSIS_PROMPT = `
You evaluate email deliverability risk caused by tone, not HTML structure.

Focus on whether the wording sounds:
- pushy, coercive, or overly insistent
- artificially urgent or pressure-heavy
- exaggerated, hype-driven, or too salesy
- manipulative in the CTA
- suspiciously promotional for a cold or business email

Examples of risky tone include wording like:
- immediate recommendations
- act now
- limited time
- don't miss this
- double your results
- guaranteed outcomes

Do not over-penalize normal business language, calm requests, operational follow-ups, or clear professional CTAs.

Return a low scoreImpact when the tone is calm, measured, and respectful.
Return a higher scoreImpact only when the tone itself could make mailbox providers or recipients distrust the email.

Keep the output concise, specific, and useful for the sender.
`;

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<head[\s\S]*?<\/head>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function analyzeEmailTone(
  input: AnalyzeEmailSpamInput
): Promise<EmailToneAnalysis | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }

  const subject = (input.subject ?? "").trim();
  const plainText = stripHtml(input.htmlContent ?? "");
  if (!subject && plainText.length < 40) {
    return null;
  }

  const google = createGoogleGenerativeAI({ apiKey });

  const { object } = await generateObject({
    model: google("gemini-2.5-flash"),
    schema: toneAnalysisSchema,
    system: EMAIL_TONE_ANALYSIS_PROMPT,
    prompt: [
      `Subject: ${subject || "(empty subject)"}`,
      `Body: ${plainText || "(empty body)"}`,
    ].join("\n\n"),
  });

  return {
    ...object,
    model: "gemini-2.5-flash",
  };
}
