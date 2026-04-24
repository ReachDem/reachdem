import { z } from "zod";
import { withWorkspace } from "@reachdem/auth/guards";
import { buildReadTools } from "@/lib/ai/tools/read-tools";
import { buildWriteTools } from "@/lib/ai/tools/write-tools";
import { buildNavTools } from "@/lib/ai/tools/nav-tools";
import { buildHermesSystemPrompt } from "@/lib/ai/system-prompt";
import { streamWithGemini } from "@/lib/ai/providers";
import { prisma } from "@reachdem/database";

// Write tool names — tool-call events for these will be injected as [[APPROVAL:...]] markers
const WRITE_TOOL_NAMES = new Set([
  "create_group",
  "update_group",
  "delete_group",
  "create_campaign",
  "update_campaign",
  "delete_campaign",
  "send_sms",
  "send_email",
  "craft_email",
]);

const requestSchema = z.object({
  message: z.string().min(1).max(8000),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      })
    )
    .optional(),
  page: z
    .object({
      pageType: z.string().optional(),
      resourceType: z.string().optional(),
      resourceId: z.string().optional(),
    })
    .optional(),
  conversationSummary: z.string().optional(),
});

export const POST = withWorkspace(async ({ req, userId, organizationId }) => {
  const body = await req.json();
  const parsed = requestSchema.safeParse(body);

  if (!parsed.success) {
    return new Response(
      JSON.stringify({
        error: "Invalid request",
        details: parsed.error.flatten(),
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const { message, history = [], page, conversationSummary } = parsed.data;

  // Fetch user name for personalization
  const user = await prisma.user
    .findUnique({
      where: { id: userId },
      select: { name: true, firstName: true },
    })
    .catch(() => null);

  const userName = user?.firstName ?? user?.name?.split(" ")[0] ?? undefined;

  const pageContext = page?.resourceType
    ? `${page.resourceType}${page.resourceId ? ` (ID: ${page.resourceId})` : ""}`
    : (page?.pageType ?? undefined);

  const systemPrompt = buildHermesSystemPrompt({
    organizationId,
    userName,
    pageContext,
    conversationSummary,
  });

  // Build all tools — read tools execute server-side, write tools return tool-calls
  const tools = {
    ...buildReadTools(organizationId),
    ...buildWriteTools(),
    ...buildNavTools(),
  };

  // Compose message history
  const messages: { role: "user" | "assistant"; content: string }[] = [
    ...history.slice(-10), // keep last 10 turns for context
    { role: "user", content: message },
  ];

  try {
    const result = streamWithGemini({
      system: systemPrompt,
      messages,
      tools: tools as Parameters<typeof streamWithGemini>[0]["tools"],
      maxSteps: 10,
    });

    // Build a custom ReadableStream from fullStream so we can intercept write
    // tool-call events and inject [[APPROVAL:{...}]] markers into the text.
    const encoder = new TextEncoder();
    const body = new ReadableStream({
      async start(controller) {
        try {
          for await (const part of result.fullStream) {
            if (part.type === "text-delta") {
              controller.enqueue(encoder.encode(part.text));
            } else if (
              part.type === "tool-call" &&
              WRITE_TOOL_NAMES.has(part.toolName)
            ) {
              const marker = JSON.stringify({
                id: crypto.randomUUID(),
                toolName: part.toolName,
                args: part.input,
              });
              controller.enqueue(encoder.encode(`[[APPROVAL:${marker}]]`));
            }
            // read tool calls/results, finish, step-finish etc. are invisible to client
          }
        } catch (streamErr: unknown) {
          const msg =
            streamErr instanceof Error ? streamErr.message : "Stream error";
          controller.enqueue(encoder.encode(`\n\n[Erreur: ${msg}]`));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(body, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        "X-Hermes-Version": "2",
      },
    });
  } catch (error: unknown) {
    console.error("[POST /api/ai/chat/stream]", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
