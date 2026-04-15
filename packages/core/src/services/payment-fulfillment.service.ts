import { prisma } from "@reachdem/database";
import type { PaymentKind } from "@reachdem/shared";
import {
  PaymentSuccessEmail,
  sendTransactionalEmail,
} from "@reachdem/transactional";
import { PaymentCurrencyService } from "./payment-currency.service";

interface FulfillPaymentInput {
  paymentSessionId: string;
  organizationId: string;
  kind: PaymentKind;
  planCode?: string | null;
  creditsQuantity?: number | null;
}

export class PaymentFulfillmentService {
  static async fulfill(input: FulfillPaymentInput): Promise<void> {
    const session = await prisma.paymentSession.findUnique({
      where: { id: input.paymentSessionId },
      include: {
        initiatedBy: true,
      },
    });

    if (!session || session.activatedAt) {
      return;
    }

    const fulfilled = await prisma.$transaction(async (tx) => {
      // Use updateMany for atomic check-and-set
      const result = await tx.paymentSession.updateMany({
        where: { id: input.paymentSessionId, activatedAt: null },
        data: {
          activatedAt: new Date(),
        },
      });

      if (result.count === 0) {
        return false; // Already fulfilled!
      }

      if (input.kind === "subscription") {
        await tx.organization.update({
          where: { id: input.organizationId },
          data: {
            planCode: input.planCode ?? "free",
          },
        });
      } else if (input.kind === "creditPurchase") {
        const convertedBalanceMinor = PaymentCurrencyService.convertAmountMinor(
          session.amountMinor,
          session.currency,
          PaymentCurrencyService.getBaseCurrency()
        );

        await tx.organization.update({
          where: { id: input.organizationId },
          data: {
            creditBalance: {
              increment: convertedBalanceMinor,
            },
          },
        });
      }

      return true;
    });

    if (fulfilled) {
      // Send email out of transaction
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
    }
  }
}
