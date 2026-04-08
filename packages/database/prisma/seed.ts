import { prisma } from "@reachdem/database";

const DEFAULT_SMS_TIERS = [
  { minimumQuantity: 1, unitAmountMinor: 25 },
  { minimumQuantity: 5_001, unitAmountMinor: 22 },
  { minimumQuantity: 20_001, unitAmountMinor: 20 },
  { minimumQuantity: 100_001, unitAmountMinor: 18 },
];

const DEFAULT_EMAIL_TIERS = [
  { minimumQuantity: 1, unitAmountMinor: 7 },
  { minimumQuantity: 10_001, unitAmountMinor: 5 },
  { minimumQuantity: 50_001, unitAmountMinor: 4 },
  { minimumQuantity: 200_001, unitAmountMinor: 3 },
];

function parseTiers(envKey: string, fallback: typeof DEFAULT_SMS_TIERS) {
  const raw = process.env[envKey];
  if (!raw) return fallback;

  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error(`${envKey} must be a non-empty JSON array`);
  }

  return parsed.map((tier) => {
    const minimumQuantity = Number(tier.minimumQuantity);
    const unitAmountMinor = Number(tier.unitAmountMinor);
    if (
      !Number.isInteger(minimumQuantity) ||
      minimumQuantity <= 0 ||
      !Number.isInteger(unitAmountMinor) ||
      unitAmountMinor <= 0
    ) {
      throw new Error(`${envKey} contains an invalid pricing tier`);
    }
    return { minimumQuantity, unitAmountMinor };
  });
}

async function seedDefaultApiPricingProfile() {
  const name =
    process.env.API_DEFAULT_PRICING_PROFILE_NAME ?? "Default API Pricing";
  const currency = (
    process.env.API_DEFAULT_PRICING_CURRENCY ??
    process.env.PAYMENT_DEFAULT_CURRENCY ??
    "XAF"
  ).toUpperCase();
  const smsTiers = parseTiers("API_DEFAULT_SMS_TIERS_JSON", DEFAULT_SMS_TIERS);
  const emailTiers = parseTiers(
    "API_DEFAULT_EMAIL_TIERS_JSON",
    DEFAULT_EMAIL_TIERS
  );

  const existing = await prisma.apiPricingProfile.findFirst({
    where: { isDefault: true },
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });

  if (existing) {
    await prisma.apiPricingProfile.update({
      where: { id: existing.id },
      data: {
        name,
        currency,
        isDefault: true,
        active: true,
        smsTiers,
        emailTiers,
      },
    });
    await prisma.apiPricingProfile.updateMany({
      where: { isDefault: true, id: { not: existing.id } },
      data: { isDefault: false },
    });
    return;
  }

  await prisma.apiPricingProfile.create({
    data: {
      name,
      currency,
      isDefault: true,
      active: true,
      smsTiers,
      emailTiers,
    },
  });
}

try {
  await seedDefaultApiPricingProfile();
  console.log("Seeded default API pricing profile");
} finally {
  await prisma.$disconnect();
}
