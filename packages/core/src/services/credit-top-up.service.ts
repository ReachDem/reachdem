import type { WorkspaceBillingSummary } from "@reachdem/shared";
import { BillingCatalogService } from "./billing-catalog.service";
import { PaymentCurrencyService } from "./payment-currency.service";

type TopUpQuote = {
  enteredAmountMinor: number;
  enteredCurrency: string;
  balanceCurrency: string;
  convertedBalanceMinor: number;
  minimumAmountMinor: number;
};

export class CreditTopUpService {
  static getMinimumAmountMinor(currency: string): number {
    const pricing = BillingCatalogService.getCreditPricing();
    const minimumPricingAmount =
      BillingCatalogService.getCreditMinimumAmountMinor();

    return PaymentCurrencyService.convertAmountMinor(
      minimumPricingAmount,
      pricing.currency,
      currency
    );
  }

  static getTopUpConfig(): WorkspaceBillingSummary["topUpConfig"] {
    const baseCurrency = PaymentCurrencyService.getBaseCurrency();
    const supportedCurrencies = PaymentCurrencyService.getSupportedCurrencies();

    return {
      baseCurrency,
      supportedCurrencies,
      minimumAmountMinorByCurrency: Object.fromEntries(
        supportedCurrencies.map((currency) => [
          currency,
          this.getMinimumAmountMinor(currency),
        ])
      ),
    };
  }

  static quoteFromEnteredAmount(
    amountMinor: number,
    currency: string
  ): TopUpQuote {
    const normalizedCurrency = currency.toUpperCase();
    const balanceCurrency = PaymentCurrencyService.getBaseCurrency();
    const convertedBalanceMinor = PaymentCurrencyService.convertAmountMinor(
      amountMinor,
      normalizedCurrency,
      balanceCurrency
    );
    const minimumAmountMinor = this.getMinimumAmountMinor(normalizedCurrency);

    if (amountMinor < minimumAmountMinor) {
      throw new Error(
        `Minimum top up amount is ${minimumAmountMinor.toLocaleString()} ${normalizedCurrency}`
      );
    }

    return {
      enteredAmountMinor: amountMinor,
      enteredCurrency: normalizedCurrency,
      balanceCurrency,
      convertedBalanceMinor,
      minimumAmountMinor,
    };
  }
}
