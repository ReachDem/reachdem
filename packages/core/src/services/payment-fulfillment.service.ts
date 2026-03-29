import { prisma } from "@reachdem/database";
import type { PaymentKind } from "@reachdem/shared";

interface FulfillPaymentInput {
  paymentSessionId: string;
  organizationId: string;
  kind: PaymentKind;
  planCode?: string | null;
  creditsQuantity?: number | null;
}

export class PaymentFulfillmentService {
  static async fulfill(input: FulfillPaymentInput): Promise<void> {
    await prisma.$transaction(async (tx) => {
      const session = await tx.paymentSession.findUnique({
        where: { id: input.paymentSessionId },
        select: { activatedAt: true },
      });

      if (!session || session.activatedAt) {
        return;
      }

      const existing = await tx.workspaceBillingState.findUnique({
        where: { organizationId: input.organizationId },
      });

      if (input.kind === "subscription") {
        await tx.workspaceBillingState.upsert({
          where: { organizationId: input.organizationId },
          create: {
            organizationId: input.organizationId,
            currentPlanCode: input.planCode ?? null,
            creditsBalance: existing?.creditsBalance ?? 0,
            lastPaymentSessionId: input.paymentSessionId,
          },
          update: {
            currentPlanCode: input.planCode ?? null,
            lastPaymentSessionId: input.paymentSessionId,
          },
        });
      } else if (input.kind === "creditPurchase") {
        await tx.workspaceBillingState.upsert({
          where: { organizationId: input.organizationId },
          create: {
            organizationId: input.organizationId,
            currentPlanCode: existing?.currentPlanCode ?? null,
            creditsBalance: input.creditsQuantity ?? 0,
            lastPaymentSessionId: input.paymentSessionId,
          },
          update: {
            creditsBalance: {
              increment: input.creditsQuantity ?? 0,
            },
            lastPaymentSessionId: input.paymentSessionId,
          },
        });
      }

      await tx.paymentSession.update({
        where: { id: input.paymentSessionId },
        data: {
          activatedAt: new Date(),
        },
      });
    });
  }
}
