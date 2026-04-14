import { useCallback, useState } from "react";
import type {
  CreateDirectChargeDto,
  DirectChargeResponse,
  PaymentNextAction,
  VerifyDirectChargeResponse,
} from "@reachdem/shared";

export type PaymentState = {
  status:
    | "idle"
    | "loading"
    | "requires_action"
    | "verifying"
    | "success"
    | "error";
  chargeId?: string;
  nextAction?: PaymentNextAction | Record<string, unknown>;
  errorMessage?: string;
};

export function usePayment() {
  const [paymentState, setPaymentState] = useState<PaymentState>({
    status: "idle",
  });

  const initiatePayment = useCallback(
    async (payload: CreateDirectChargeDto) => {
      setPaymentState({ status: "loading" });

      try {
        const res = await fetch("/api/v1/payments/charge", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const result = (await res.json()) as DirectChargeResponse & {
          error?: string;
          message?: string;
        };

        if (!res.ok) {
          throw new Error(
            result.error || result.message || "Failed to initiate payment"
          );
        }

        const chargeData =
          result.data && typeof result.data === "object" ? result.data : null;
        const nextAction =
          result.next_action && typeof result.next_action === "object"
            ? result.next_action
            : undefined;
        const chargeId =
          chargeData && typeof chargeData.id === "string"
            ? chargeData.id
            : chargeData && typeof chargeData.id === "number"
              ? String(chargeData.id)
              : undefined;
        const status =
          chargeData && typeof chargeData.status === "string"
            ? chargeData.status.toLowerCase()
            : null;

        if (status === "successful" || status === "succeeded") {
          setPaymentState({ status: "success", chargeId });
          return;
        }

        if (status === "failed" || status === "cancelled") {
          setPaymentState({
            status: "error",
            errorMessage: "Payment could not be completed.",
          });
          return;
        }

        if (!nextAction) {
          if (chargeId) {
            setPaymentState({ status: "verifying", chargeId });
          } else {
            setPaymentState({
              status: "error",
              errorMessage: "Unexpected response from payment provider",
            });
          }
          return;
        }

        setPaymentState({ status: "requires_action", chargeId, nextAction });

        if (
          nextAction &&
          "type" in nextAction &&
          nextAction.type === "redirect_url" &&
          "redirect_url" in nextAction &&
          nextAction.redirect_url?.url
        ) {
          window.location.href = nextAction.redirect_url.url;
        }
      } catch (err: any) {
        setPaymentState({ status: "error", errorMessage: err.message });
      }
    },
    []
  );

  const verifyPayment = useCallback(async (chargeId: string) => {
    setPaymentState((prev) => ({ ...prev, status: "verifying" }));

    try {
      const res = await fetch(`/api/v1/payments/verify?chargeId=${chargeId}`);
      const result = (await res.json()) as VerifyDirectChargeResponse & {
        error?: string;
        message?: string;
      };

      if (!res.ok) {
        throw new Error(
          result.error || result.message || "Verification failed"
        );
      }

      if (result.success) {
        setPaymentState({ status: "success" });
      } else {
        setPaymentState({
          status: "error",
          errorMessage: "Payment not verified yet or failed.",
        });
      }
    } catch {
      setPaymentState({
        status: "error",
        errorMessage: "Failed to verify transaction.",
      });
    }
  }, []);

  return { paymentState, initiatePayment, verifyPayment, setPaymentState };
}
