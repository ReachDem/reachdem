import { useState, useCallback } from "react";
import { type ChargeRequestBody } from "@reachdem/core";

export type NextAction = {
  type: "redirect_url" | "payment_instruction";
  redirect_url?: { url: string };
  payment_instruction?: { note: string };
};

export type PaymentState = {
  status:
    | "idle"
    | "loading"
    | "requires_action"
    | "verifying"
    | "success"
    | "error";
  chargeId?: string;
  nextAction?: NextAction;
  errorMessage?: string;
};

export function usePayment() {
  const [paymentState, setPaymentState] = useState<PaymentState>({
    status: "idle",
  });

  const initiatePayment = useCallback(async (payload: any) => {
    setPaymentState({ status: "loading" });
    try {
      const res = await fetch("/api/v1/payments/charge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(
          result.error || result.message || "Failed to initiate payment"
        );
      }

      const nextAction = result.next_action;
      const chargeId = result.data?.id;

      if (!nextAction) {
        // Mode d'erreur inattendu (pas d'action à prendre)
        setPaymentState({
          status: "error",
          errorMessage: "Unexpected response from payment provider",
        });
        return;
      }

      setPaymentState({ status: "requires_action", chargeId, nextAction });

      // Si c'est une redirection (ex: OPay, Mobile Money Ug/Gh vers un portail)
      if (nextAction.type === "redirect_url" && nextAction.redirect_url?.url) {
        window.location.href = nextAction.redirect_url.url;
      }
    } catch (err: any) {
      setPaymentState({ status: "error", errorMessage: err.message });
    }
  }, []);

  const verifyPayment = useCallback(async (chargeId: string) => {
    setPaymentState((prev) => ({ ...prev, status: "verifying" }));
    try {
      const res = await fetch(`/api/v1/payments/verify?chargeId=${chargeId}`);
      const result = await res.json();

      if (result.success) {
        setPaymentState({ status: "success" });
      } else {
        setPaymentState({
          status: "error",
          errorMessage: "Payment not verified yet or failed.",
        });
      }
    } catch (err: any) {
      setPaymentState({
        status: "error",
        errorMessage: "Failed to verify transaction.",
      });
    }
  }, []);

  return { paymentState, initiatePayment, verifyPayment, setPaymentState };
}
