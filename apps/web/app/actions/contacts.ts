"use server";

import { prisma, Prisma } from "@reachdem/database";
import { auth } from "@reachdem/auth";
import { computeContactChannelFlags } from "@reachdem/shared";
import { headers } from "next/headers";

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
  if (validPhones.length > 0)
    orConditions.push({ phoneE164: { in: validPhones } });

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

  const existingEmails = existing
    .map((e) => e.email)
    .filter(Boolean) as string[];
  const existingPhones = existing
    .map((e) => e.phoneE164)
    .filter(Boolean) as string[];

  return { existingEmails, existingPhones };
}

/**
 * Handle bulk insertion of contacts.
 * Performs a single findMany to detect duplicates, then createMany for new
 * contacts and a batched $transaction for updates — O(1) round-trips regardless
 * of chunk size.
 */
export async function importContactsBulk(
  orgId: string,
  contacts: any[],
  strategy: "skip" | "update" | "merge" = "skip"
) {
  const organizationId = orgId || (await getOrganizationId());

  if (!contacts || contacts.length === 0) {
    return { success: true, count: 0 };
  }

  // ── 1. Normalise & sanitise each contact ──────────────────────────────────
  const normalised = contacts.map((c) => {
    const email = c.email ? c.email.toLowerCase().trim() : undefined;
    const phone = c.phoneE164 || undefined;

    let birthdate = c.birthdate ?? null;
    if (birthdate && typeof birthdate === "string") {
      const d = new Date(birthdate);
      birthdate = isNaN(d.getTime()) ? null : d;
    }

    let gender = c.gender ?? "UNKNOWN";
    if (gender && typeof gender === "string") {
      const g = gender.toLowerCase().trim();
      gender = ["male", "m", "homme"].includes(g)
        ? "MALE"
        : ["female", "f", "femme", "woman"].includes(g)
          ? "FEMALE"
          : "OTHER";
    }

    return { ...c, email, phoneE164: phone, birthdate, gender };
  });
  // ── 2. Collect all emails & phones for a single duplicate lookup ───────────
  const allEmails = normalised.map((c) => c.email).filter(Boolean) as string[];
  const allPhones = normalised
    .map((c) => c.phoneE164)
    .filter(Boolean) as string[];

  const orConditions: Prisma.ContactWhereInput[] = [];
  if (allEmails.length > 0) orConditions.push({ email: { in: allEmails } });
  if (allPhones.length > 0) orConditions.push({ phoneE164: { in: allPhones } });

  const existingContacts =
    orConditions.length > 0
      ? await prisma.contact.findMany({
          where: { organizationId, deletedAt: null, OR: orConditions },
        })
      : [];

  // Build O(1) lookup maps
  const byEmail = new Map(
    existingContacts.filter((c) => c.email).map((c) => [c.email!, c])
  );
  const byPhone = new Map(
    existingContacts.filter((c) => c.phoneE164).map((c) => [c.phoneE164!, c])
  );

  // ── 3. Partition into create / update ─────────────────────────────────────
  const toCreate: Prisma.ContactCreateManyInput[] = [];
  const toUpdate: Array<{ id: string; data: Prisma.ContactUpdateInput }> = [];
  const STANDARD_KEYS = [
    "name",
    "email",
    "phoneE164",
    "gender",
    "birthdate",
    "address",
    "work",
    "enterprise",
  ] as const;

  for (const c of normalised) {
    const existing =
      (c.email && byEmail.get(c.email)) ||
      (c.phoneE164 && byPhone.get(c.phoneE164));

    if (existing) {
      if (strategy === "skip") continue;

      // build update payload
      const updateData: any = {};
      for (const key of STANDARD_KEYS) {
        if (strategy === "merge") {
          if (c[key] !== undefined)
            updateData[key] = c[key] === "" ? null : c[key];
        } else {
          // "update": only overwrite with non-empty values
          if (c[key] !== undefined && c[key] !== "" && c[key] !== null) {
            updateData[key] = c[key];
          }
        }
      }
      if (c.customFields) {
        updateData.customFields = {
          ...((existing.customFields as object) ?? {}),
          ...c.customFields,
        };
      }
      Object.assign(
        updateData,
        computeContactChannelFlags({
          email:
            updateData.email !== undefined ? updateData.email : existing.email,
          phoneE164:
            updateData.phoneE164 !== undefined
              ? updateData.phoneE164
              : existing.phoneE164,
        })
      );
      toUpdate.push({ id: existing.id, data: updateData });
    } else {
      toCreate.push({
        organizationId,
        name: c.name || "Unknown",
        ...computeContactChannelFlags({
          email: c.email || null,
          phoneE164: c.phoneE164 || null,
        }),
        gender: c.gender || "UNKNOWN",
        birthdate: c.birthdate || null,
        address: c.address || null,
        work: c.work || null,
        enterprise: c.enterprise || null,
        customFields: c.customFields ?? Prisma.JsonNull,
      });
    }
  }

  // ── 4. Execute bulk operations ─────────────────────────────────────────────
  let successCount = 0;

  if (toCreate.length > 0) {
    const result = await prisma.contact.createMany({
      data: toCreate,
      skipDuplicates: true,
    });
    successCount += result.count;
  }

  if (toUpdate.length > 0) {
    await prisma.$transaction(
      toUpdate.map(({ id, data }) =>
        prisma.contact.update({ where: { id }, data })
      )
    );
    successCount += toUpdate.length;
  }

  return { success: true, count: successCount };
}

/**
 * Infer country code from IP for phone formatting.
 */
export async function getDefaultCountryCode() {
  const headersList = await headers();
  return headersList.get("x-vercel-ip-country") || "CM";
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
      createdAt: "desc",
    },
  });

  return contacts;
}

/**
 * Update a single contact for the active organization.
 */
export async function updateContact(
  contactId: string,
  data: {
    name?: string;
    email?: string | null;
    phoneE164?: string | null;
    gender?: string;
    birthdate?: Date | null;
    address?: string | null;
    work?: string | null;
    enterprise?: string | null;
    customFields?: Record<string, unknown>;
  }
) {
  try {
    const organizationId = await getOrganizationId();

    // Verify the contact belongs to this organization
    const existing = await prisma.contact.findFirst({
      where: {
        id: contactId,
        organizationId,
        deletedAt: null,
      },
    });

    if (!existing) {
      return { success: false, error: "Contact not found" };
    }

    // Update the contact
    const updateData: any = {
      ...data,
      ...computeContactChannelFlags({
        email: data.email !== undefined ? data.email : existing.email,
        phoneE164:
          data.phoneE164 !== undefined ? data.phoneE164 : existing.phoneE164,
      }),
    };

    const updated = await prisma.contact.update({
      where: { id: contactId },
      data: updateData,
    });

    return { success: true, contact: updated };
  } catch (error) {
    console.error("Error updating contact:", error);
    return { success: false, error: "Failed to update contact" };
  }
}

/**
 * Soft-delete one or more contacts for the active organization.
 */
export async function deleteContacts(ids: string[]) {
  const organizationId = await getOrganizationId();
  const uniqueIds = [...new Set(ids.filter(Boolean))];

  if (uniqueIds.length === 0) {
    return { success: true, count: 0 };
  }

  const result = await prisma.contact.updateMany({
    where: {
      id: { in: uniqueIds },
      organizationId,
      deletedAt: null,
    },
    data: {
      deletedAt: new Date(),
    },
  });

  return { success: true, count: result.count };
}
