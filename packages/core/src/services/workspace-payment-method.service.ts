import { prisma } from "@reachdem/database";

type SavedWorkspacePaymentMethod = {
  provider: "flutterwave";
  providerCustomerId: string;
  providerPaymentMethodId: string;
  paymentMethodType: string;
  brand?: string | null;
  first6?: string | null;
  last4?: string | null;
  expiryMonth?: number | null;
  expiryYear?: number | null;
  cardHolderName?: string | null;
  reusable: boolean;
  savedAt: string;
};

type OrganizationMetadataShape = {
  flutterwavePaymentMethods?: SavedWorkspacePaymentMethod[];
  [key: string]: unknown;
};

type ParsedPaymentMethodReference = {
  providerCustomerId: string;
  providerPaymentMethodId: string;
  paymentMethodType: string;
  brand?: string | null;
  first6?: string | null;
  last4?: string | null;
  expiryMonth?: number | null;
  expiryYear?: number | null;
  cardHolderName?: string | null;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function parseOrganizationMetadata(
  raw: string | null
): OrganizationMetadataShape {
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    return asRecord(parsed) ?? {};
  } catch {
    return {
      legacyRawMetadata: raw,
    };
  }
}

function parseFromRetrieveChargePayload(
  payload: Record<string, unknown> | null | undefined
): ParsedPaymentMethodReference | null {
  const root = asRecord(payload);
  const data = asRecord(root?.data);
  const paymentMethod = asRecord(data?.payment_method_details);
  const card = asRecord(paymentMethod?.card);
  const providerPaymentMethodId = asString(paymentMethod?.id);
  const providerCustomerId =
    asString(paymentMethod?.customer) ??
    asString(data?.customer) ??
    asString(data?.customer_id);

  if (!providerPaymentMethodId || !providerCustomerId) {
    return null;
  }

  return {
    providerCustomerId,
    providerPaymentMethodId,
    paymentMethodType: asString(paymentMethod?.type) ?? "card",
    brand: asString(card?.network),
    first6: asString(card?.first6),
    last4: asString(card?.last4),
    expiryMonth: asNumber(card?.expiry_month),
    expiryYear: asNumber(card?.expiry_year),
    cardHolderName: asString(card?.card_holder_name),
  };
}

function parseFromWebhookPayload(
  payload: Record<string, unknown> | null | undefined
): ParsedPaymentMethodReference | null {
  const root = asRecord(payload);
  const data = asRecord(root?.data);
  const paymentMethod = asRecord(data?.payment_method);
  const card = asRecord(paymentMethod?.card);
  const customer = asRecord(data?.customer);
  const providerPaymentMethodId = asString(paymentMethod?.id);
  const providerCustomerId =
    asString(paymentMethod?.customer_id) ?? asString(customer?.id);

  if (!providerPaymentMethodId || !providerCustomerId) {
    return null;
  }

  return {
    providerCustomerId,
    providerPaymentMethodId,
    paymentMethodType: asString(paymentMethod?.type) ?? "card",
    brand: asString(card?.network),
    first6: asString(card?.first6),
    last4: asString(card?.last4),
    expiryMonth: asNumber(card?.expiry_month),
    expiryYear: asNumber(card?.expiry_year),
    cardHolderName: asString(card?.card_holder_name),
  };
}

export class WorkspacePaymentMethodService {
  static async saveFromChargePayload(args: {
    organizationId: string;
    payload: Record<string, unknown> | null | undefined;
  }): Promise<void> {
    const reference =
      parseFromRetrieveChargePayload(args.payload) ??
      parseFromWebhookPayload(args.payload);

    if (!reference || reference.paymentMethodType !== "card") {
      return;
    }

    const organization = await prisma.organization.findUnique({
      where: { id: args.organizationId },
      select: { metadata: true },
    });

    if (!organization) {
      return;
    }

    const metadata = parseOrganizationMetadata(organization.metadata);
    const existing = Array.isArray(metadata.flutterwavePaymentMethods)
      ? metadata.flutterwavePaymentMethods
      : [];

    const nextEntry: SavedWorkspacePaymentMethod = {
      provider: "flutterwave",
      providerCustomerId: reference.providerCustomerId,
      providerPaymentMethodId: reference.providerPaymentMethodId,
      paymentMethodType: reference.paymentMethodType,
      brand: reference.brand ?? null,
      first6: reference.first6 ?? null,
      last4: reference.last4 ?? null,
      expiryMonth: reference.expiryMonth ?? null,
      expiryYear: reference.expiryYear ?? null,
      cardHolderName: reference.cardHolderName ?? null,
      reusable: true,
      savedAt: new Date().toISOString(),
    };

    const deduped = [
      nextEntry,
      ...existing.filter(
        (item) =>
          item.providerPaymentMethodId !== nextEntry.providerPaymentMethodId
      ),
    ].slice(0, 10);

    metadata.flutterwavePaymentMethods = deduped;

    await prisma.organization.update({
      where: { id: args.organizationId },
      data: {
        metadata: JSON.stringify(metadata),
      },
    });
  }
}
