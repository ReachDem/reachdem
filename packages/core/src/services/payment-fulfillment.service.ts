import { prisma } from "@reachdem/database";
import type { PaymentKind } from "@reachdem/shared";
import {
  PaymentSuccessEmail,
  sendTransactionalEmail,
} from "@reachdem/transactional";

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
        include: {
          initiatedBy: true,
        },
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

      // Send email out of transaction or as a side-effect, we can just do it here loosely
      // but without awaiting heavily if we don't want to block, or we just fire and forget.
      try {
        if (session.initiatedBy?.email) {
          const userName = session.initiatedBy.name || "User";
          const amountFormatted = `${new Intl.NumberFormat("en-US").format(session.amountMinor)} ${session.currency}`;
          const baseUrl =
            process.env.NEXT_PUBLIC_APP_URL || "https://reachdem.com";

          // We simulate generating a PDF invoice for now by sending a simple attachment
          const dummyInvoiceContent = Buffer.from(
            `INVOICE\n\nReachdem\nReceipt for payment: ${session.id}\nAmount: ${amountFormatted}\nDate: ${new Date().toISOString()}\n\nThank you!`
          );

          await sendTransactionalEmail({
            to: session.initiatedBy.email,
            subject: "Your Reachdem Payment was Successful",
            react: PaymentSuccessEmail({
              name: userName,
              amountFormatted,
              baseUrl,
            }),
            attachments: [
              {
                filename: `invoice-${session.id.substring(0, 8)}.txt`, // txt for now or PDF dummy
                content: dummyInvoiceContent,
              },
            ],
          });
        }
      } catch (err) {
        console.error("Failed to send payment success email:", err);
      }
    });
  }
}
