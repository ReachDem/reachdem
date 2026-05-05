import { describe, expect, it } from "vitest";
import {
  getEmailSpamWarningReasons,
  shouldWarnBeforeSendingEmail,
} from "@/lib/email/email-send-guard";
import {
  analyzeEmailSpam,
  applyToneAnalysisToEmailSpam,
} from "@/lib/email/email-spam-score";

describe("email send guard", () => {
  it("does not warn for low-risk operational copy", () => {
    const analysis = analyzeEmailSpam({
      subject: "Follow-up from today",
      htmlContent:
        "<p>Hello,</p><p>Sharing the notes and next steps from today's meeting.</p>",
    });

    expect(shouldWarnBeforeSendingEmail(analysis)).toBe(false);
  });

  it("warns when tone analysis raises medium risk", () => {
    const baseAnalysis = analyzeEmailSpam({
      subject: "Some recommendations for your team",
      htmlContent:
        "<p>Hello,</p><p>We reviewed your workflow and have a few ideas to share.</p>",
    });

    const analysis = applyToneAnalysisToEmailSpam(baseAnalysis, {
      risk: "medium",
      scoreImpact: 8,
      summary:
        "The call to action feels pressure-heavy and implies urgency without enough context.",
      problematicPatterns: ["pressure-heavy CTA"],
      recommendation: "Soften the CTA and remove implied urgency.",
      confidence: 0.84,
      model: "gemini-2.5-flash",
    });

    expect(shouldWarnBeforeSendingEmail(analysis)).toBe(true);
    expect(getEmailSpamWarningReasons(analysis)).toContain(
      "The call to action feels pressure-heavy and implies urgency without enough context."
    );
  });
});
