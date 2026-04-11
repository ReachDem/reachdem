import {
  analyzeEmailSpam,
  applyToneAnalysisToEmailSpam,
  type AnalyzeEmailSpamInput,
  type EmailSpamAnalysis,
} from "@/lib/email-spam-score";
import { analyzeEmailTone } from "@/lib/email-tone-analysis";

export async function analyzeEmailSpamWithAI(
  input: AnalyzeEmailSpamInput
): Promise<EmailSpamAnalysis> {
  const heuristicAnalysis = analyzeEmailSpam(input);

  try {
    const toneAnalysis = await analyzeEmailTone(input);
    return applyToneAnalysisToEmailSpam(heuristicAnalysis, toneAnalysis);
  } catch (error) {
    console.error("Failed to analyze email tone with Gemini:", error);
    return heuristicAnalysis;
  }
}
