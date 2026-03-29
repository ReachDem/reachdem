export class PaymentSessionNotFoundError extends Error {
  constructor() {
    super("Payment session not found");
    this.name = "PaymentSessionNotFoundError";
  }
}

export class PaymentConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaymentConfigurationError";
  }
}

export class PaymentWebhookSignatureError extends Error {
  constructor(message = "Invalid payment webhook signature") {
    super(message);
    this.name = "PaymentWebhookSignatureError";
  }
}

export class PaymentVerificationError extends Error {
  constructor(message = "Unable to verify payment with provider") {
    super(message);
    this.name = "PaymentVerificationError";
  }
}
