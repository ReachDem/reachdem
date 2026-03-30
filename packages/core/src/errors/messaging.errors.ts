export class MessageSendValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MessageSendValidationError";
  }
}

export class MessageInsufficientCreditsError extends Error {
  constructor(message = "Insufficient credits to send message") {
    super(message);
    this.name = "MessageInsufficientCreditsError";
  }
}
