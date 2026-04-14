import {
  convertAmountMinorWithRates,
  getDefaultRateToXaf,
} from "@reachdem/shared";

export class PaymentCurrencyService {
  static getBaseCurrency(): string {
    return (process.env.PAYMENT_DEFAULT_CURRENCY ?? "XAF").toUpperCase();
  }

  static getSupportedCurrencies(): string[] {
    const configuredCurrencies = (
      process.env.PAYMENT_SUPPORTED_TOP_UP_CURRENCIES ??
      `${this.getBaseCurrency()},USD,EUR,NGN,XOF,UGX`
    )
      .split(",")
      .map((currency) => currency.trim().toUpperCase())
      .filter(Boolean);

    return Array.from(new Set(configuredCurrencies));
  }

  static getRateToXaf(currency: string): number {
    const normalizedCurrency = currency.toUpperCase();
    if (normalizedCurrency === "XAF") {
      return 1;
    }

    const envKey = `PAYMENT_EXCHANGE_RATE_${normalizedCurrency}_TO_XAF`;
    const raw = process.env[envKey];
    const parsed = Number(raw);

    if (raw && Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }

    return getDefaultRateToXaf(normalizedCurrency);
  }

  static convertAmountMinor(
    amountMinor: number,
    fromCurrency: string,
    toCurrency: string
  ): number {
    return convertAmountMinorWithRates({
      amountMinor,
      fromCurrency,
      toCurrency,
      getRateToXaf: (currency) => this.getRateToXaf(currency),
    });
  }
}
