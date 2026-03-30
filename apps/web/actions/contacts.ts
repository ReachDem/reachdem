"use server";

import { prisma } from "@reachdem/database";
import { computeContactChannelFlags } from "@reachdem/shared";
import { headers } from "next/headers";

export async function checkContactDuplicates(
  organizationId: string,
  emails: string[],
  phones: string[]
) {
  if (emails.length === 0 && phones.length === 0) {
    return { existingEmails: [], existingPhones: [] };
  }

  const validEmails = emails.filter(Boolean);
  const validPhones = phones.filter(Boolean);

  const orConditions: any[] = [];
  if (validEmails.length > 0) {
    orConditions.push({ email: { in: validEmails } });
  }
  if (validPhones.length > 0) {
    orConditions.push({ phoneE164: { in: validPhones } });
  }

  if (orConditions.length === 0) {
    return { existingEmails: [], existingPhones: [] };
  }

  const existingContacts = await prisma.contact.findMany({
    where: {
      organizationId,
      OR: orConditions,
    },
    select: {
      email: true,
      phoneE164: true,
    },
  });

  const existingEmails = existingContacts
    .map((c) => c.email)
    .filter(Boolean) as string[];
  const existingPhones = existingContacts
    .map((c) => c.phoneE164)
    .filter(Boolean) as string[];

  return {
    existingEmails,
    existingPhones,
  };
}

export async function getDefaultCountryCode() {
  const headersList = await headers();
  // Vercel populates this header with the 2-letter ISO country code (e.g. "SN", "FR", "US")
  return headersList.get("x-vercel-ip-country") || "CM";
}

export async function importContactsBulk(
  organizationId: string,
  contacts: any[] // We will receive the fully formatted contacts
) {
  if (!contacts || contacts.length === 0) return { count: 0 };

  // To avoid exhausting connections or long-running queries, we use createMany
  // The caller is expected to chunk these (e.g., 10 at a time) and handle deduplication strategy.

  const result = await prisma.contact.createMany({
    data: contacts.map((c) => ({
      organizationId,
      ...c,
      ...computeContactChannelFlags({
        email: c.email ?? null,
        phoneE164: c.phoneE164 ?? null,
      }),
    })),
    skipDuplicates: true, // Safety net, though caller handles strategy
  });

  return { count: result.count };
}
