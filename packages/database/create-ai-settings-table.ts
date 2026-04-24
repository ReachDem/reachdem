import { prisma } from "./src/index.ts";

await prisma.$executeRawUnsafe(`
  CREATE TABLE IF NOT EXISTS public.ai_user_settings (
    id TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "preferredProvider" TEXT NOT NULL DEFAULT 'gemini',
    "openaiApiKeyEncrypted" TEXT,
    "elevenlabsAgentId" TEXT,
    "voiceEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ai_user_settings_user_fk FOREIGN KEY ("userId") REFERENCES public."user"(id) ON DELETE CASCADE,
    CONSTRAINT ai_user_settings_org_fk FOREIGN KEY ("organizationId") REFERENCES public.organization(id) ON DELETE CASCADE
  )
`);

await prisma.$executeRawUnsafe(`
  CREATE UNIQUE INDEX IF NOT EXISTS "ai_user_settings_userId_organizationId_key"
  ON public.ai_user_settings("userId", "organizationId")
`);

await prisma.$executeRawUnsafe(`
  CREATE INDEX IF NOT EXISTS "ai_user_settings_organizationId_preferredProvider_idx"
  ON public.ai_user_settings("organizationId", "preferredProvider")
`);

await prisma.$disconnect();
console.log("ai_user_settings table created successfully.");
