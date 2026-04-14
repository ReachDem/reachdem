import type { PaymentProvider } from "@reachdem/shared";
import { FlutterwaveHostedPaymentAdapter } from "../adapters/payments/flutterwave-hosted-payment.adapter";
import { FlutterwaveDirectChargeAdapter } from "../adapters/payments/flutterwave-direct-charge.adapter";
import { StripePaymentAdapter } from "../adapters/payments/stripe-payment.adapter";
import type { DirectChargeProviderPort } from "../ports/direct-charge-provider.port";
import type { PaymentProviderPort } from "../ports/payment-provider.port";

export class PaymentAdapterRegistryService {
  static getHostedProvider(provider: PaymentProvider): PaymentProviderPort {
    switch (provider) {
      case "flutterwave":
        return new FlutterwaveHostedPaymentAdapter();
      case "stripe":
        return new StripePaymentAdapter();
    }
  }

  static getDirectChargeProvider(
    provider: PaymentProvider
  ): DirectChargeProviderPort {
    switch (provider) {
      case "flutterwave":
        return new FlutterwaveDirectChargeAdapter();
      case "stripe":
        throw new Error("Stripe direct charge adapter is not implemented.");
    }
  }
}
