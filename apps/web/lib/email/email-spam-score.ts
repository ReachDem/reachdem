export type EmailSpamSeverity = "low" | "medium" | "high";

export interface EmailSpamFactor {
  id: string;
  label: string;
  impact: number;
  details: string;
  recommendation?: string;
}

export interface EmailToneAnalysis {
  risk: EmailSpamSeverity;
  scoreImpact: number;
  summary: string;
  problematicPatterns: string[];
  recommendation: string;
  confidence: number;
  model: string;
}

export interface EmailSpamAnalysis {
  score: number;
  severity: EmailSpamSeverity;
  summary: string;
  plainText: string;
  wordCount: number;
  linkCount: number;
  imageCount: number;
  factors: EmailSpamFactor[];
  recommendations: string[];
  toneAnalysis: EmailToneAnalysis | null;
}

export interface AnalyzeEmailSpamInput {
  subject?: string;
  htmlContent?: string;
}

const SPAM_TRIGGER_PATTERNS: Array<{
  pattern: RegExp;
  label: string;
}> = [
  { pattern: /\bfree\b/i, label: "Uses 'free'" },
  { pattern: /\bguaranteed?\b/i, label: "Uses 'guaranteed'" },
  { pattern: /\burgent\b/i, label: "Uses 'urgent'" },
  { pattern: /\blimited time\b/i, label: "Uses 'limited time'" },
  { pattern: /\bact now\b/i, label: "Uses 'act now'" },
  { pattern: /\bbuy now\b/i, label: "Uses 'buy now'" },
  { pattern: /\bearn (?:money|cash)\b/i, label: "Uses 'earn money/cash'" },
  { pattern: /\b100%\b/i, label: "Uses '100%'" },
  { pattern: /\bclick here\b/i, label: "Uses 'click here'" },
  { pattern: /\bwinner\b/i, label: "Uses 'winner'" },
  { pattern: /\bno risk\b/i, label: "Uses 'no risk'" },
  { pattern: /\bdouble your\b/i, label: "Uses aggressive promise" },
];

const HIDDEN_TEXT_PATTERNS = [
  /display\s*:\s*none/i,
  /visibility\s*:\s*hidden/i,
  /opacity\s*:\s*0(?:[;"}\s]|$)/i,
  /font-size\s*:\s*0(?:px)?/i,
  /mso-hide\s*:\s*all/i,
];

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function stripHtml(html: string): string {
  return decodeHtmlEntities(
    html
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<head[\s\S]*?<\/head>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  );
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function extractLinks(html: string): string[] {
  const links = new Set<string>();
  const hrefRegex = /href\s*=\s*"([^"]+)"/gi;
  const textUrlRegex = /\bhttps?:\/\/[^\s"'<>]+/gi;

  for (const match of html.matchAll(hrefRegex)) {
    if (match[1]) {
      links.add(match[1]);
    }
  }

  for (const match of html.matchAll(textUrlRegex)) {
    if (match[0]) {
      links.add(match[0]);
    }
  }

  return [...links];
}

function extractImageCount(html: string): number {
  return [...html.matchAll(/<img\b/gi)].length;
}

function countEmoji(text: string): number {
  return [...text].filter((char) => /\p{Extended_Pictographic}/u.test(char))
    .length;
}

function countAllCapsWords(text: string): number {
  return (
    text.match(/\b[A-Z]{4,}\b/g)?.filter((word) => /[A-Z]/.test(word)).length ??
    0
  );
}

function createSummary(score: number): string {
  if (score >= 65) {
    return "High spam risk. The message has multiple patterns mailbox providers often dislike.";
  }

  if (score >= 35) {
    return "Medium spam risk. The message should be tightened before sending broadly.";
  }

  return "Low spam risk. The content looks reasonably healthy for a first pass.";
}

function createAnalysisResult(args: {
  factors: EmailSpamFactor[];
  plainText: string;
  wordCount: number;
  linkCount: number;
  imageCount: number;
  toneAnalysis?: EmailToneAnalysis | null;
}): EmailSpamAnalysis {
  const score = clamp(
    args.factors.reduce((total, factor) => total + factor.impact, 0),
    0,
    100
  );
  const severity: EmailSpamSeverity =
    score >= 65 ? "high" : score >= 35 ? "medium" : "low";

  const recommendations = [
    ...new Set(
      args.factors
        .map((factor) => factor.recommendation)
        .filter((recommendation): recommendation is string =>
          Boolean(recommendation)
        )
    ),
  ];

  return {
    score,
    severity,
    summary: createSummary(score),
    plainText: args.plainText,
    wordCount: args.wordCount,
    linkCount: args.linkCount,
    imageCount: args.imageCount,
    factors: args.factors.sort((left, right) => right.impact - left.impact),
    recommendations,
    toneAnalysis: args.toneAnalysis ?? null,
  };
}

export function analyzeEmailSpam(
  input: AnalyzeEmailSpamInput
): EmailSpamAnalysis {
  const subject = (input.subject ?? "").trim();
  const htmlContent = input.htmlContent ?? "";
  const plainText = stripHtml(htmlContent);
  const combinedText = `${subject} ${plainText}`.trim();
  const lowerCombinedText = combinedText.toLowerCase();
  const wordCount = plainText.length > 0 ? plainText.split(/\s+/).length : 0;
  const links = extractLinks(htmlContent);
  const imageCount = extractImageCount(htmlContent);
  const factors: EmailSpamFactor[] = [];

  const addFactor = (factor: EmailSpamFactor) => {
    factors.push(factor);
  };

  if (!subject) {
    addFactor({
      id: "missing-subject",
      label: "Missing subject",
      impact: 18,
      details:
        "Messages without a subject are easy for providers and humans to distrust.",
      recommendation: "Add a clear, plain-language subject line.",
    });
  } else if (subject.length > 80) {
    addFactor({
      id: "long-subject",
      label: "Long subject line",
      impact: 8,
      details: `The subject is ${subject.length} characters long, which can look promotional and get truncated.`,
      recommendation: "Keep the subject closer to 30-60 characters.",
    });
  }

  const exclamationCount = (combinedText.match(/!/g) ?? []).length;
  if (exclamationCount >= 3) {
    addFactor({
      id: "excessive-exclamation",
      label: "Too many exclamation marks",
      impact: clamp(4 + exclamationCount, 6, 12),
      details: `The message uses ${exclamationCount} exclamation marks, which is a common spam signal.`,
      recommendation:
        "Use neutral punctuation and reserve emphasis for one key point.",
    });
  }

  const allCapsWords = countAllCapsWords(combinedText);
  if (allCapsWords >= 2) {
    addFactor({
      id: "all-caps",
      label: "Aggressive capitalization",
      impact: clamp(4 + allCapsWords * 2, 6, 14),
      details: `The copy contains ${allCapsWords} all-caps words, which can feel shouty.`,
      recommendation: "Rewrite headings and CTAs in normal sentence case.",
    });
  }

  const emojiCount = countEmoji(combinedText);
  if (emojiCount >= 3) {
    addFactor({
      id: "emoji-heavy",
      label: "Heavy emoji usage",
      impact: clamp(emojiCount * 2, 6, 12),
      details: `The message uses ${emojiCount} emoji characters, which can push it toward promotional territory.`,
      recommendation:
        "Reduce emojis to none or one at most in outreach emails.",
    });
  }

  const spamTriggerHits = SPAM_TRIGGER_PATTERNS.filter(({ pattern }) =>
    pattern.test(lowerCombinedText)
  );
  if (spamTriggerHits.length > 0) {
    addFactor({
      id: "spam-trigger-phrases",
      label: "Spam-trigger wording",
      impact: clamp(spamTriggerHits.length * 4, 6, 24),
      details: `Detected phrases such as ${spamTriggerHits
        .slice(0, 3)
        .map((hit) => hit.label.toLowerCase())
        .join(", ")}.`,
      recommendation:
        "Swap hype-driven phrases for concrete, specific language.",
    });
  }

  if (plainText.length < 80) {
    addFactor({
      id: "low-text-volume",
      label: "Very little readable text",
      impact: 10,
      details:
        "Mailbox providers can distrust emails with very little human-readable text.",
      recommendation:
        "Add a few clear sentences that explain the message naturally.",
    });
  }

  if (links.length >= 4) {
    addFactor({
      id: "too-many-links",
      label: "Too many links",
      impact: clamp(links.length * 2, 8, 20),
      details: `The HTML contains ${links.length} distinct links, which can look overly promotional.`,
      recommendation: "Keep one primary CTA and remove non-essential links.",
    });
  }

  if (links.length > 0 && wordCount > 0) {
    const wordsPerLink = wordCount / links.length;
    if (wordsPerLink < 25) {
      addFactor({
        id: "link-density",
        label: "Link-heavy content",
        impact: 8,
        details: `There are only about ${Math.max(
          1,
          Math.round(wordsPerLink)
        )} words per link.`,
        recommendation:
          "Increase explanatory copy around links or reduce link count.",
      });
    }
  }

  if (imageCount >= 3 && wordCount < 120) {
    addFactor({
      id: "image-heavy",
      label: "Image-heavy email",
      impact: 8,
      details: `The message includes ${imageCount} images with relatively little accompanying text.`,
      recommendation:
        "Balance images with more live text so the email still makes sense without visuals.",
    });
  }

  if (/data:image\//i.test(htmlContent)) {
    addFactor({
      id: "embedded-images",
      label: "Embedded base64 images",
      impact: 16,
      details:
        "Base64-embedded images increase HTML weight and can trip filters.",
      recommendation:
        "Host images remotely and reference them with standard URLs.",
    });
  }

  if (/<form\b/i.test(htmlContent) || /<script\b/i.test(htmlContent)) {
    addFactor({
      id: "unsafe-html",
      label: "Unsafe HTML elements",
      impact: 24,
      details:
        "Forms and scripts are commonly stripped or blocked by email clients and filters.",
      recommendation: "Remove forms and scripts from email HTML.",
    });
  }

  if (HIDDEN_TEXT_PATTERNS.some((pattern) => pattern.test(htmlContent))) {
    addFactor({
      id: "hidden-text",
      label: "Hidden text detected",
      impact: 25,
      details:
        "The HTML includes styles commonly used to hide content from readers.",
      recommendation:
        "Remove hidden text and keep the visible copy honest and direct.",
    });
  }

  const moneySignals = (combinedText.match(/[$€£₦%]/g) ?? []).length;
  if (moneySignals >= 4) {
    addFactor({
      id: "money-signals",
      label: "Too many money/discount symbols",
      impact: 8,
      details:
        "Heavy use of money and discount symbols can make the email look promotional.",
      recommendation:
        "Describe the offer in words instead of stacking symbols and percentages.",
    });
  }

  return createAnalysisResult({
    factors,
    plainText,
    wordCount,
    linkCount: links.length,
    imageCount,
  });
}

export function applyToneAnalysisToEmailSpam(
  analysis: EmailSpamAnalysis,
  toneAnalysis: EmailToneAnalysis | null
): EmailSpamAnalysis {
  if (!toneAnalysis || toneAnalysis.scoreImpact <= 0) {
    return {
      ...analysis,
      toneAnalysis,
    };
  }

  const toneFactor: EmailSpamFactor = {
    id: "ai-tone-risk",
    label: "Pushy or promotional tone",
    impact: clamp(toneAnalysis.scoreImpact, 0, 20),
    details: toneAnalysis.summary,
    recommendation: toneAnalysis.recommendation,
  };

  return createAnalysisResult({
    factors: [...analysis.factors, toneFactor],
    plainText: analysis.plainText,
    wordCount: analysis.wordCount,
    linkCount: analysis.linkCount,
    imageCount: analysis.imageCount,
    toneAnalysis,
  });
}
