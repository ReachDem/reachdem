import { tool } from "ai";
import { z } from "zod";

/**
 * navigate_to is a client-side tool.
 * When the model calls it, the client executes `router.push(page)` directly —
 * no server round-trip needed.
 */
export const navigateTool = tool({
  description:
    "Navigate to a specific page in the ReachDem application. Use this when the user asks to go to, open, or show a specific section of the app.",
  inputSchema: z.object({
    page: z
      .string()
      .describe(
        "The URL path to navigate to. Examples: /contacts, /campaigns, /campaigns/new, /settings, /dashboard, /groups"
      ),
    reason: z
      .string()
      .optional()
      .describe("Brief explanation of why navigating here"),
  }),
});

export function buildNavTools() {
  return {
    navigate_to: navigateTool,
  };
}
