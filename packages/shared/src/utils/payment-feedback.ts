function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function toReadableLabel(value: string | null): string | null {
  if (!value) {
    return null;
  }

  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

export type FlutterwaveChargeFailureInsight = {
  status: string | null;
  processorCode: string | null;
  processorType: string | null;
  processorLabel: string | null;
  userMessage: string;
  backofficeMessage: string;
  retryable: boolean;
};

export function getFlutterwaveChargeFailureInsight(
  input: unknown
): FlutterwaveChargeFailureInsight | null {
  const root = asRecord(input);
  const chargeData = asRecord(root?.data) ?? root;

  if (!chargeData) {
    return null;
  }

  const status =
    typeof chargeData.status === "string"
      ? chargeData.status.toLowerCase()
      : null;

  if (status !== "failed" && status !== "cancelled") {
    return null;
  }

  const processorResponse =
    asRecord(chargeData.processor_response) ??
    asRecord(chargeData.processorResponse);
  const processorCode = asString(processorResponse?.code);
  const processorType =
    asString(processorResponse?.type)?.toLowerCase() ?? null;
  const processorLabel = toReadableLabel(processorType);

  let userMessage =
    "Your bank declined this card payment. Please try another card or contact your bank.";
  let backofficeMessage =
    "Flutterwave returned a card decline from the issuer.";
  let retryable = false;

  if (
    processorCode === "62" ||
    processorType === "invalid_restricted_service_code"
  ) {
    userMessage =
      "This card cannot be used for this payment. Try another card or contact your bank to remove the restriction.";
    backofficeMessage =
      "Issuer decline code 62 / invalid_restricted_service_code. The card or service is restricted for this transaction, channel, region, or merchant configuration.";
  } else if (processorCode === "51" || processorType === "insufficient_funds") {
    userMessage =
      "This card does not have enough funds for the payment. Try another card or top up the account.";
    backofficeMessage = "Issuer decline for insufficient funds.";
  } else if (processorCode === "54" || processorType === "expired_card") {
    userMessage = "This card has expired. Please use a different card.";
    backofficeMessage = "Issuer decline for expired card.";
  } else if (
    processorCode === "55" ||
    processorType === "incorrect_pin" ||
    processorType === "invalid_pin"
  ) {
    userMessage =
      "The card PIN was rejected. Please retry with the correct PIN or use another card.";
    backofficeMessage = "Issuer decline for invalid PIN.";
    retryable = true;
  } else if (
    processorCode === "57" ||
    processorType === "transaction_not_permitted_to_cardholder"
  ) {
    userMessage =
      "This card is not allowed for this type of payment. Please use another card or contact your bank.";
    backofficeMessage =
      "Issuer decline because the transaction is not permitted for the cardholder.";
  } else if (
    processorCode === "58" ||
    processorType === "transaction_not_permitted_to_terminal"
  ) {
    userMessage =
      "This payment is not allowed on the current channel. Please try another payment method.";
    backofficeMessage =
      "Issuer decline because the transaction is not permitted on the terminal or channel.";
  } else if (processorCode === "91" || processorType === "issuer_unavailable") {
    userMessage =
      "Your bank could not be reached right now. Please try again in a few minutes.";
    backofficeMessage = "Issuer or switch unavailable.";
    retryable = true;
  } else if (processorCode === "05" || processorType === "do_not_honor") {
    userMessage =
      "Your bank declined this payment. Please try another card or contact your bank.";
    backofficeMessage = "Issuer returned a do_not_honor decline.";
  }

  if (processorCode || processorType || processorLabel) {
    backofficeMessage = [
      backofficeMessage,
      processorCode ? `Processor code: ${processorCode}.` : null,
      processorType ? `Processor type: ${processorType}.` : null,
      processorLabel ? `Label: ${processorLabel}.` : null,
    ]
      .filter(Boolean)
      .join(" ");
  }

  return {
    status,
    processorCode,
    processorType,
    processorLabel,
    userMessage,
    backofficeMessage,
    retryable,
  };
}
