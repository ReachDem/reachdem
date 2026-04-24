import { prisma } from "@reachdem/database";

export async function createElevenLabsSession(input: {
  userId: string;
  organizationId: string;
  agentId?: string | null;
}) {
  const [settings, user] = await Promise.all([
    prisma.aiUserSettings.findUnique({
      where: {
        userId_organizationId: {
          userId: input.userId,
          organizationId: input.organizationId,
        },
      },
      select: {
        elevenlabsAgentId: true,
        voiceEnabled: true,
      },
    }),
    prisma.user.findUnique({
      where: { id: input.userId },
      select: { firstName: true, name: true },
    }),
  ]);

  const agentId =
    input.agentId ??
    settings?.elevenlabsAgentId ??
    process.env.ELEVENLABS_AGENT_ID;

  // Block only when voice is explicitly disabled AND there's no fallback agent
  if (!settings?.voiceEnabled && !agentId) {
    throw new Error(
      "Voice is not configured. Set ELEVENLABS_AGENT_ID or enable voice in settings."
    );
  }
  const apiKey = process.env.ELEVENLABS_API_KEY;

  if (!agentId) {
    throw new Error("No ElevenLabs agent is configured.");
  }

  if (!apiKey) {
    throw new Error("ELEVENLABS_API_KEY is not configured.");
  }

  const response = await fetch(
    `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${encodeURIComponent(agentId)}`,
    {
      method: "GET",
      headers: {
        "xi-api-key": apiKey,
      },
    }
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Failed to create ElevenLabs session: ${response.status} ${body}`
    );
  }

  const body = (await response.json()) as { signed_url?: string };

  if (!body.signed_url) {
    throw new Error("ElevenLabs did not return a signed URL.");
  }

  return {
    agentId,
    signedUrl: body.signed_url,
    userFirstName: user?.firstName ?? user?.name?.split(" ")[0] ?? null,
  };
}
