import { describe, expect, it } from "vitest";
import { CreditTopUpService } from "../src/services/credit-top-up.service";

describe("CreditTopUpService", () => {
  it("returns a minimum top up config for supported currencies", () => {
    const config = CreditTopUpService.getTopUpConfig();

    expect(config.baseCurrency).toBe("XAF");
    expect(config.supportedCurrencies).toContain("XAF");
    expect(config.supportedCurrencies).toContain("EUR");
    expect(config.minimumAmountMinorByCurrency.XAF).toBe(250);
  });

  it("derives credits from an entered XAF amount", () => {
    const quote = CreditTopUpService.quoteFromEnteredAmount(6250, "XAF");

    expect(quote.pricingCurrency).toBe("XAF");
    expect(quote.creditsQuantity).toBe(250);
    expect(quote.appliedUnitAmountMinor).toBe(25);
  });

  it("derives credits from a converted USD amount", () => {
    const quote = CreditTopUpService.quoteFromEnteredAmount(2_000, "USD");

    expect(quote.enteredCurrency).toBe("USD");
    expect(quote.convertedAmountMinor).toBeGreaterThan(0);
    expect(quote.creditsQuantity).toBeGreaterThanOrEqual(250);
  });
});
