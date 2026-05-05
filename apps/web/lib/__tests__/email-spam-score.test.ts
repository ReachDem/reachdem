import { describe, expect, it } from "vitest";
import {
  analyzeEmailSpam,
  applyToneAnalysisToEmailSpam,
} from "@/lib/email/email-spam-score";

describe("analyzeEmailSpam", () => {
  it("keeps a simple operational email in the low-risk band", () => {
    const analysis = analyzeEmailSpam({
      subject: "Meeting notes from today",
      htmlContent:
        "<p>Hi Line,</p><p>Here are the notes from today's meeting and the two actions we agreed on for next week.</p><p>Best,<br />ReachDem</p>",
    });

    expect(analysis.severity).toBe("low");
    expect(analysis.score).toBeLessThan(35);
    expect(analysis.factors).toHaveLength(0);
  });

  it("flags hype-heavy copy with multiple deliverability issues", () => {
    const analysis = analyzeEmailSpam({
      subject: "FREE!!! ACT NOW to DOUBLE YOUR SALES!!!",
      htmlContent: `
        <div style="display:none">hidden text</div>
        <p>Click here for a limited time FREE offer and earn cash fast!!!</p>
        <p><a href="https://example.com/1">Offer 1</a></p>
        <p><a href="https://example.com/2">Offer 2</a></p>
        <p><a href="https://example.com/3">Offer 3</a></p>
        <p><a href="https://example.com/4">Offer 4</a></p>
      `,
    });

    expect(analysis.severity).toBe("high");
    expect(analysis.score).toBeGreaterThanOrEqual(65);
    expect(analysis.factors.map((factor) => factor.id)).toEqual(
      expect.arrayContaining([
        "hidden-text",
        "too-many-links",
        "spam-trigger-phrases",
        "excessive-exclamation",
      ])
    );
  });

  it("detects image-heavy promotional markup", () => {
    const analysis = analyzeEmailSpam({
      subject: "New launch details",
      htmlContent: `
        <p>New collection</p>
        <img src="https://cdn.example.com/hero.jpg" />
        <img src="https://cdn.example.com/secondary.jpg" />
        <img src="https://cdn.example.com/tertiary.jpg" />
      `,
    });

    expect(analysis.factors.map((factor) => factor.id)).toContain(
      "image-heavy"
    );
    expect(analysis.imageCount).toBe(3);
  });

  it("adds Gemini tone findings into the final spam score", () => {
    const baseAnalysis = analyzeEmailSpam({
      subject: "Some recommendations for your team",
      htmlContent:
        "<p>Hello,</p><p>We reviewed your workflow and have a few ideas to share.</p>",
    });

    const analysis = applyToneAnalysisToEmailSpam(baseAnalysis, {
      risk: "medium",
      scoreImpact: 9,
      summary:
        "The wording sounds slightly pressure-heavy because it promises immediate action without much context.",
      problematicPatterns: ["pressure-heavy CTA", "implied urgency"],
      recommendation:
        "Soften the CTA and describe the help as a suggestion instead of an urgent next step.",
      confidence: 0.82,
      model: "gemini-2.5-flash",
    });

    expect(analysis.score).toBe(baseAnalysis.score + 9);
    expect(analysis.factors.map((factor) => factor.id)).toContain(
      "ai-tone-risk"
    );
    expect(analysis.toneAnalysis?.risk).toBe("medium");
    expect(analysis.recommendations).toContain(
      "Soften the CTA and describe the help as a suggestion instead of an urgent next step."
    );
  });
});
