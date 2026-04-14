const ZERO_DECIMAL_CURRENCIES = new Set(["XAF", "XOF", "JPY", "KRW", "UGX"]);

const DEFAULT_RATE_TO_XAF: Record<string, number> = {
  XAF: 1,
  XOF: 1,
  USD: 600,
  EUR: 655.957,
  NGN: 0.4,
  UGX: 0.16,
};

export function getCurrencyMinorExponent(currency: string): number {
  return ZERO_DECIMAL_CURRENCIES.has(currency.toUpperCase()) ? 0 : 2;
}

export function convertMinorToMajor(
  amountMinor: number,
  currency: string
): number {
  return amountMinor / 10 ** getCurrencyMinorExponent(currency);
}

export function convertMajorToMinor(
  amountMajor: number,
  currency: string
): number {
  return Math.round(amountMajor * 10 ** getCurrencyMinorExponent(currency));
}

export function getDefaultRateToXaf(currency: string): number {
  return DEFAULT_RATE_TO_XAF[currency.toUpperCase()] ?? 1;
}

export function convertAmountMinorWithRates(args: {
  amountMinor: number;
  fromCurrency: string;
  toCurrency: string;
  getRateToXaf?: (currency: string) => number;
}): number {
  const fromCurrency = args.fromCurrency.toUpperCase();
  const toCurrency = args.toCurrency.toUpperCase();

  if (fromCurrency === toCurrency) {
    return Math.round(args.amountMinor);
  }

  const getRateToXaf = args.getRateToXaf ?? getDefaultRateToXaf;
  const fromMajor = convertMinorToMajor(args.amountMinor, fromCurrency);
  const amountInXaf = fromMajor * getRateToXaf(fromCurrency);
  const toMajor = amountInXaf / getRateToXaf(toCurrency);

  return convertMajorToMinor(toMajor, toCurrency);
}
