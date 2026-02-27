"use server";

import { prisma } from "@reachdem/database";
import { auth } from "@reachdem/auth";
import { headers } from "next/headers";
import { Prisma } from "@prisma/client";

async function getOrganizationId() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session || !session.user) {
    throw new Error("Unauthorized");
  }
  const organizationId = session.session?.activeOrganizationId;
  if (!organizationId) {
    throw new Error("Organization selection required");
  }
  return organizationId;
}

/**
 * Batch query the database for existing emails and phones.
 */
export async function checkContactDuplicates(
  orgId: string,
  emails: string[],
  phones: string[]
) {
  // Can still verify org access if needed, but we'll use the passed orgId
  const organizationId = orgId || (await getOrganizationId());

  const validEmails = emails.filter(Boolean);
  const validPhones = phones.filter(Boolean);

  if (validEmails.length === 0 && validPhones.length === 0) {
    return { existingEmails: [], existingPhones: [] };
  }

  const orConditions: Prisma.ContactWhereInput[] = [];
  if (validEmails.length > 0) orConditions.push({ email: { in: validEmails } });
  if (validPhones.length > 0) orConditions.push({ phoneE164: { in: validPhones } });

  const existing = await prisma.contact.findMany({
    where: {
      organizationId,
      deletedAt: null,
      OR: orConditions,
    },
    select: {
      email: true,
      phoneE164: true,
    },
  });

  const existingEmails = existing.map((e) => e.email).filter(Boolean) as string[];
  const existingPhones = existing.map((e) => e.phoneE164).filter(Boolean) as string[];

  return { existingEmails, existingPhones };
}

/**
 * Handle bulk insertion of contacts.
 * For chunks of 10-100 contacts.
 */
export async function importContactsBulk(
  orgId: string,
  contacts: any[],
  strategy: "skip" | "update" | "merge" = "skip" // UI seems to not pass strategy correctly? Let's default to skip and wait, UI calls it as importContactsBulk(orgId, chunk)
) {
  const organizationId = orgId || (await getOrganizationId());

  if (!contacts || contacts.length === 0) {
    return { success: true, count: 0 };
  }

  // We could process these sequentially or parallelize,
  // but since limits are 10 at a time, sequential is fine.
  let successCount = 0;

  for (const c of contacts) {
    // 1. Identify if it already exists
    const email = c.email ? c.email.toLowerCase().trim() : undefined;
    const phone = c.phoneE164 ? c.phoneE164 : undefined;

    if (c.birthdate && typeof c.birthdate === "string") {
      const parsedDate = new Date(c.birthdate);
      c.birthdate = isNaN(parsedDate.getTime()) ? null : parsedDate;
    }

    if (c.gender && typeof c.gender === "string") {
      const g = c.gender.toLowerCase().trim();
      c.gender = ["male", "m", "homme"].includes(g)
        ? "MALE"
        : ["female", "f", "femme", "woman"].includes(g)
        ? "FEMALE"
        : "OTHER";
    }

    let existingContact = null;

    if (email || phone) {
      const orConditions: Prisma.ContactWhereInput[] = [];
      if (email) orConditions.push({ email });
      if (phone) orConditions.push({ phoneE164: phone });

      existingContact = await prisma.contact.findFirst({
        where: {
          organizationId,
          deletedAt: null,
          OR: orConditions,
        },
      });
    }

    if (existingContact) {
      if (strategy === "skip") {
        continue;
      } else if (strategy === "update" || strategy === "merge") {
        // Construct the update payload
        const updateData: any = {};

        const standardKeys = [
          "name", "email", "phoneE164", "gender", "birthdate", "address", "work", "enterprise"
        ];
        
        for (const key of standardKeys) {
          if (strategy === "merge") {
            // Overwrite even if empty
            if (c[key] !== undefined) updateData[key] = c[key] === "" ? null : c[key];
          } else {
            // Update only if new data is present
            if (c[key] !== undefined && c[key] !== "" && c[key] !== null) {
              updateData[key] = c[key];
            }
          }
        }

        // Custom fields handling
        if (c.customFields) {
          const mergedCustomFields = {
            ...(existingContact.customFields as object || {}),
            ...c.customFields,
          };
          updateData.customFields = mergedCustomFields;
        }

        await prisma.contact.update({
          where: { id: existingContact.id },
          data: updateData,
        });
        successCount++;
        continue; // proceed to next contact
      }
    }

    // 2. Insert new contact
    try {
      await prisma.contact.create({
        data: {
          organizationId,
          name: c.name || "Unknown",
          email: email || null,
          phoneE164: phone || null,
          gender: c.gender || "UNKNOWN",
          birthdate: c.birthdate || null,
          address: c.address || null,
          work: c.work || null,
          enterprise: c.enterprise || null,
          customFields: c.customFields || Prisma.JsonNull,
        },
      });
      successCount++;
    } catch (error) {
       console.error("Failed to create contact:", error);
    }
  }

  return { success: true, count: successCount };
}

/**
 * Infer country code from IP for phone formatting.
 */
export async function getDefaultCountryCode() {
  const headersList = await headers();
  const country = headersList.get("x-vercel-ip-country") || "CM"; // default to Cameroon

  // Mapping of some common countries to their calling codes because our lightweight tool needs the + prefix
  const mapping: Record<string, string> = {
    "CM": "+237",
    "SN": "+221",
    "CI": "+225",
    "FR": "+33",
    "US": "+1",
    "GB": "+44",
    "CA": "+1",
    "NG": "+234",
    "GH": "+233",
    "KE": "+254",
  };

  return mapping[country] || "+237";
}

/**
 * Fetch all contacts for the active organization.
 */
export async function getContacts() {
  const organizationId = await getOrganizationId();
  
  const contacts = await prisma.contact.findMany({
    where: {
      organizationId,
      deletedAt: null,
    },
    orderBy: {
      createdAt: 'desc',
    }
  });

  return contacts;
}
