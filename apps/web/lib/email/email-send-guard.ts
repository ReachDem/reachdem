import type {
  AnalyzeEmailSpamInput,
  EmailSpamAnalysis,
} from "@/lib/email/email-spam-score";

export async function fetchEmailSpamAnalysis(
  input: AnalyzeEmailSpamInput
): Promise<EmailSpamAnalysis | null> {
  try {
    const response = await fetch("/api/campaigns/spam-score", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      throw new Error("Failed to analyze email spam risk");
    }

    const data = await response.json();
    return data.spamAnalysis ?? null;
  } catch (error) {
    console.error("Failed to fetch email spam analysis:", error);
    return null;
  }
}

export function shouldWarnBeforeSendingEmail(
  analysis: EmailSpamAnalysis | null
): analysis is EmailSpamAnalysis {
  if (!analysis) {
    return false;
  }

  return (
    analysis.score >= 35 ||
    analysis.severity !== "low" ||
    (analysis.toneAnalysis?.risk ?? "low") !== "low"
  );
}

export function getEmailSpamWarningReasons(
  analysis: EmailSpamAnalysis,
  limit = 3
): string[] {
  const reasons = new Set<string>();

  if (analysis.toneAnalysis?.summary) {
    reasons.add(analysis.toneAnalysis.summary);
  }

  for (const factor of analysis.factors) {
    if (factor.id === "ai-tone-risk") {
      continue;
    }

    reasons.add(factor.details);

    if (reasons.size >= limit) {
      break;
    }
  }

  return [...reasons].slice(0, limit);
}
