export class BillingConfigurationError extends Error {
  constructor(message = "Billing is not configured") {
    super(message);
    this.name = "BillingConfigurationError";
  }
}

export class BillingInsufficientCreditsError extends Error {
  constructor(message = "Insufficient credit balance") {
    super(message);
    this.name = "BillingInsufficientCreditsError";
  }
}

export class BillingCurrencyMismatchError extends Error {
  constructor(message = "Billing currency does not match wallet currency") {
    super(message);
    this.name = "BillingCurrencyMismatchError";
  }
}
