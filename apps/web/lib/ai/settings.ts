import { prisma } from "@reachdem/database";
import { decryptAISecret, encryptAISecret } from "./crypto";
import type {
  AIProvider,
  AISettingsPayload,
  AISettingsUpdateInput,
} from "./types";
import { Prisma } from "@reachdem/database";

function normalizeProvider(value?: string | null): AIProvider {
  return value === "openai" ? "openai" : "gemini";
}

function isMissingAiSettingsTable(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2021"
  );
}

export async function getAISettings(
  userId: string,
  organizationId: string
): Promise<AISettingsPayload> {
  let record:
    | {
        preferredProvider: string;
        openaiApiKeyEncrypted: string | null;
        voiceEnabled: boolean;
        elevenlabsAgentId: string | null;
      }
    | null
    | undefined;

  try {
    record = await prisma.aiUserSettings.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId,
        },
      },
    });
  } catch (error) {
    if (!isMissingAiSettingsTable(error)) {
      throw error;
    }

    record = null;
  }

  const preferredProvider = normalizeProvider(record?.preferredProvider);
  const openaiApiKeyConfigured = Boolean(record?.openaiApiKeyEncrypted);
  const availableProviders: AIProvider[] = [];

  if (process.env.GEMINI_API_KEY) {
    availableProviders.push("gemini");
  }

  if (openaiApiKeyConfigured) {
    availableProviders.push("openai");
  }

  return {
    preferredProvider,
    openaiApiKeyConfigured,
    availableProviders,
    voiceEnabled: record?.voiceEnabled ?? false,
    elevenlabsAgentId: record?.elevenlabsAgentId ?? null,
  };
}

export async function updateAISettings(
  userId: string,
  organizationId: string,
  input: AISettingsUpdateInput
) {
  let existing:
    | {
        preferredProvider: string;
        openaiApiKeyEncrypted: string | null;
        voiceEnabled: boolean;
        elevenlabsAgentId: string | null;
      }
    | null
    | undefined;

  try {
    existing = await prisma.aiUserSettings.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId,
        },
      },
    });
  } catch (error) {
    if (isMissingAiSettingsTable(error)) {
      throw new Error(
        "AI settings storage is not available yet. Run `pnpm db:push` or the Prisma migration to create the ai_user_settings table."
      );
    }

    throw error;
  }

  const data = {
    preferredProvider: input.preferredProvider ?? existing?.preferredProvider,
    openaiApiKeyEncrypted:
      input.openaiApiKey === undefined
        ? (existing?.openaiApiKeyEncrypted ?? null)
        : input.openaiApiKey
          ? encryptAISecret(input.openaiApiKey)
          : null,
    voiceEnabled: input.voiceEnabled ?? existing?.voiceEnabled ?? false,
    elevenlabsAgentId:
      input.elevenlabsAgentId === undefined
        ? (existing?.elevenlabsAgentId ?? null)
        : input.elevenlabsAgentId,
  };

  await prisma.aiUserSettings.upsert({
    where: {
      userId_organizationId: {
        userId,
        organizationId,
      },
    },
    create: {
      userId,
      organizationId,
      preferredProvider: normalizeProvider(data.preferredProvider),
      openaiApiKeyEncrypted: data.openaiApiKeyEncrypted,
      voiceEnabled: data.voiceEnabled,
      elevenlabsAgentId: data.elevenlabsAgentId,
    },
    update: {
      preferredProvider: normalizeProvider(data.preferredProvider),
      openaiApiKeyEncrypted: data.openaiApiKeyEncrypted,
      voiceEnabled: data.voiceEnabled,
      elevenlabsAgentId: data.elevenlabsAgentId,
    },
  });

  return getAISettings(userId, organizationId);
}

export async function getOpenAIKeyForUser(
  userId: string,
  organizationId: string
): Promise<string | null> {
  let record: { openaiApiKeyEncrypted: string | null } | null;

  try {
    record = await prisma.aiUserSettings.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId,
        },
      },
      select: {
        openaiApiKeyEncrypted: true,
      },
    });
  } catch (error) {
    if (isMissingAiSettingsTable(error)) {
      return null;
    }

    throw error;
  }

  if (!record?.openaiApiKeyEncrypted) {
    return null;
  }

  return decryptAISecret(record.openaiApiKeyEncrypted);
}
