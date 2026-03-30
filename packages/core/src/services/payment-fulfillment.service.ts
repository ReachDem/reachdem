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

      if (input.kind === "subscription") {
        await tx.organization.update({
          where: { id: input.organizationId },
          data: {
            planCode: input.planCode ?? "free",
          },
        });
      } else if (input.kind === "creditPurchase") {
        await tx.organization.update({
          where: { id: input.organizationId },
          data: {
            creditBalance: {
              increment: input.creditsQuantity ?? 0,
            },
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
