import { generateText, streamText, stepCountIs, type Tool } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { getAISettings, getOpenAIKeyForUser } from "./settings";
import type { AIProvider } from "./types";

type GenerateInput = {
  userId: string;
  organizationId: string;
  providerOverride?: AIProvider;
  system: string;
  prompt: string;
  history?: { role: "user" | "assistant"; content: string }[];
};

export async function resolveProvider(input: {
  userId: string;
  organizationId: string;
  providerOverride?: AIProvider;
}): Promise<AIProvider> {
  const settings = await getAISettings(input.userId, input.organizationId);
  const preferred = input.providerOverride ?? settings.preferredProvider;

  if (preferred === "openai" && settings.openaiApiKeyConfigured) {
    return "openai";
  }

  if (process.env.GEMINI_API_KEY) {
    return "gemini";
  }

  if (settings.openaiApiKeyConfigured) {
    return "openai";
  }

  throw new Error(
    "No AI provider is configured. Add GEMINI_API_KEY or connect an OpenAI API key in AI settings."
  );
}

export async function generateAIText(input: GenerateInput): Promise<{
  providerUsed: AIProvider;
  text: string;
}> {
  const provider = await resolveProvider(input);

  try {
    if (provider === "gemini") {
      return {
        providerUsed: "gemini",
        text: await generateWithGemini(
          input.system,
          input.prompt,
          input.history
        ),
      };
    }

    return {
      providerUsed: "openai",
      text: await generateWithOpenAI(
        await requireOpenAIKey(input.userId, input.organizationId),
        input.system,
        input.prompt,
        input.history
      ),
    };
  } catch (error) {
    if (provider === "gemini") {
      const fallbackKey = await getOpenAIKeyForUser(
        input.userId,
        input.organizationId
      );

      if (fallbackKey) {
        return {
          providerUsed: "openai",
          text: await generateWithOpenAI(
            fallbackKey,
            input.system,
            input.prompt,
            input.history
          ),
        };
      }
    }

    throw error;
  }
}

async function generateWithGemini(
  system: string,
  prompt: string,
  history?: { role: "user" | "assistant"; content: string }[]
) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  const google = createGoogleGenerativeAI({
    apiKey: process.env.GEMINI_API_KEY,
  });

  const { text } = await generateText({
    model: google("gemini-2.5-pro"),
    system,
    messages: [
      ...(history ?? []).map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user" as const, content: prompt },
    ],
  });

  return text;
}

async function requireOpenAIKey(userId: string, organizationId: string) {
  const apiKey = await getOpenAIKeyForUser(userId, organizationId);

  if (!apiKey) {
    throw new Error("OpenAI is selected but no user API key is configured.");
  }

  return apiKey;
}

async function generateWithOpenAI(
  apiKey: string,
  system: string,
  prompt: string,
  history?: { role: "user" | "assistant"; content: string }[]
) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.2,
      messages: [
        { role: "system", content: system },
        ...(history ?? []),
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenAI request failed: ${response.status} ${body}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  return data.choices?.[0]?.message?.content?.trim() || "";
}

// ── Streaming (Hermes) ────────────────────────────────────────────────────────

export type StreamInput = {
  system: string;
  messages: { role: "user" | "assistant"; content: string }[];
  tools?: Record<string, Tool>;
  maxSteps?: number;
};

/**
 * Returns a streamText result using Gemini 2.5 Pro with tool support.
 * The caller is responsible for calling `.toDataStreamResponse()`.
 */
export function streamWithGemini(input: StreamInput) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  const google = createGoogleGenerativeAI({
    apiKey: process.env.GEMINI_API_KEY,
  });

  return streamText({
    model: google("gemini-2.5-pro"),
    system: input.system,
    messages: input.messages,
    tools: input.tools,
    stopWhen: stepCountIs(input.maxSteps ?? 10),
  });
}
