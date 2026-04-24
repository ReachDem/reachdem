import { z } from "zod";
import { withWorkspace } from "@reachdem/auth/guards";
import { generateText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

const requestSchema = z.object({
  history: z.array(
    z.object({ role: z.enum(["user", "assistant"]), content: z.string() })
  ),
  previousSummary: z.string().optional(),
});

export const POST = withWorkspace(async ({ req }) => {
  const body = await req.json();
  const parsed = requestSchema.safeParse(body);

  if (!parsed.success) {
    return new Response(JSON.stringify({ error: "Invalid request" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!process.env.GEMINI_API_KEY) {
    return new Response(
      JSON.stringify({ error: "No AI provider configured" }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }

  const google = createGoogleGenerativeAI({
    apiKey: process.env.GEMINI_API_KEY,
  });

  const historyText = parsed.data.history
    .map((m) => `${m.role === "user" ? "User" : "Hermès"}: ${m.content}`)
    .join("\n");

  const prevSummary = parsed.data.previousSummary
    ? `Previous summary: ${parsed.data.previousSummary}\n\n`
    : "";

  const { text } = await generateText({
    model: google("gemini-2.5-flash"),
    system:
      "You summarize conversations between a user and an AI assistant called Hermès. " +
      "Produce a concise 2-3 sentence summary that captures: key user goals, actions taken, " +
      "data referenced (group names, campaign names, contact searches), and any pending decisions. " +
      "Respond with only the summary text, no preamble.",
    prompt: `${prevSummary}Conversation to summarize:\n${historyText}`,
  });

  return new Response(JSON.stringify({ summary: text }), {
    headers: { "Content-Type": "application/json" },
  });
});
