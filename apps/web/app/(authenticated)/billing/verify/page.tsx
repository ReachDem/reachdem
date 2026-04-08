"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AnimatedShinyText } from "@/components/ui/animated-shiny-text";

type AuthorizationAction = "pin" | "otp" | null;

function normalizeAction(value: string | null): AuthorizationAction {
  if (!value) {
    return null;
  }

  const normalized = value.toLowerCase();

  if (normalized === "pin" || normalized === "requires_pin") {
    return "pin";
  }

  if (normalized === "otp" || normalized === "requires_otp") {
    return "otp";
  }

  return null;
}

function VerifyContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const chargeId = searchParams.get("chargeId");
  const method = searchParams.get("method");
  const action = normalizeAction(searchParams.get("action"));

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authValue, setAuthValue] = useState("");

  const authCopy = useMemo(() => {
    if (action === "pin") {
      return {
        title: "Enter your card PIN",
        description:
          "Flutterwave needs your card PIN to continue this authorization.",
        placeholder: "Card PIN",
        button: "Submit PIN",
      };
    }

    if (action === "otp") {
      return {
        title: "Enter the OTP",
        description:
          "Check your bank message or authenticator prompt, then enter the one-time code.",
        placeholder: "One-time password",
        button: "Submit OTP",
      };
    }

    return {
      title: "Verify on your phone",
      description:
        "Please check your mobile device to authorize the transaction. This screen will update automatically.",
      placeholder: "",
      button: "",
    };
  }, [action]);

  useEffect(() => {
    if (!chargeId || action) {
      return;
    }

    let intervalId: NodeJS.Timeout | undefined;

    const checkStatus = async () => {
      try {
        const response = await fetch(
          `/api/v1/payments/verify?chargeId=${encodeURIComponent(chargeId)}`
        );
        const data = await response.json();

        if (response.ok && data.success) {
          if (intervalId) {
            clearInterval(intervalId);
          }

          router.push(
            `/billing/success?payment_session_id=${data.paymentSessionId}${method ? `&method=${method}` : ""}`
          );
          return;
        }

        if (data.status === "failed") {
          if (intervalId) {
            clearInterval(intervalId);
          }

          setError("Verification failed.");
        }
      } catch (pollError) {
        console.error("Polling error:", pollError);
      }
    };

    intervalId = setInterval(checkStatus, 5000);
    void checkStatus();

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [action, chargeId, method, router]);

  const handleAuthorizationSubmit = async () => {
    if (!chargeId || !action) {
      return;
    }

    if (!authValue.trim()) {
      setError(`Please enter the required ${action.toUpperCase()}.`);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/v1/payments/charge/${encodeURIComponent(chargeId)}/authorize`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(
            action === "pin"
              ? { type: "pin", pin: authValue.trim() }
              : { type: "otp", otp: authValue.trim() }
          ),
        }
      );
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(
          payload.message || payload.error || "Authorization failed."
        );
      }

      const status =
        payload.data && typeof payload.data.status === "string"
          ? payload.data.status.toLowerCase()
          : null;
      const nextActionType =
        payload.next_action && typeof payload.next_action.type === "string"
          ? normalizeAction(payload.next_action.type)
          : null;

      if (status === "successful" || status === "succeeded") {
        router.push(
          `/billing/success?payment_session_id=${payload.paymentSessionId}${method ? `&method=${method}` : ""}`
        );
        return;
      }

      if (
        payload.next_action?.type === "redirect_url" &&
        payload.next_action?.redirect_url?.url
      ) {
        window.location.href = payload.next_action.redirect_url.url;
        return;
      }

      if (nextActionType === "otp") {
        router.replace(
          `/billing/verify?chargeId=${encodeURIComponent(chargeId)}${method ? `&method=${method}` : ""}&action=otp`
        );
        setAuthValue("");
        return;
      }

      if (status === "failed" || status === "cancelled") {
        setError("Payment could not be completed.");
        return;
      }

      router.replace(
        `/billing/verify?chargeId=${encodeURIComponent(chargeId)}${method ? `&method=${method}` : ""}`
      );
    } catch (submitError: any) {
      setError(submitError.message || "Authorization failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="bg-background fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden px-8 text-center">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-1/4 -right-1/4 h-[600px] w-[600px] rounded-full bg-[#ff751f]/5 blur-[120px]" />
        <div className="bg-foreground/5 absolute -bottom-1/4 -left-1/4 h-[600px] w-[600px] rounded-full blur-[120px]" />
      </div>

      <div className="z-10 mb-6">
        <AnimatedShinyText className="text-foreground/80 hover:text-foreground inline-flex items-center justify-center rounded-full transition-all duration-500 ease-in hover:cursor-pointer">
          <h1 className="text-[3.5rem] leading-none font-medium tracking-tight">
            {authCopy.title}
          </h1>
        </AnimatedShinyText>
      </div>

      <p className="text-muted-foreground relative z-10 mx-auto max-w-md text-lg leading-relaxed font-light">
        {authCopy.description}
      </p>

      {action ? (
        <div className="relative z-10 mt-10 w-full max-w-md space-y-4">
          <Input
            type="password"
            value={authValue}
            onChange={(event) => setAuthValue(event.target.value)}
            placeholder={authCopy.placeholder}
            className="h-12 border-white/10 bg-white/5 text-center text-white placeholder:text-neutral-500"
            disabled={isSubmitting}
          />
          <Button
            onClick={() => void handleAuthorizationSubmit()}
            disabled={isSubmitting}
            className="h-12 w-full rounded-lg bg-[#ff751f] text-sm font-semibold tracking-wide text-white transition-all duration-200 hover:opacity-90 active:scale-95"
          >
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            {authCopy.button}
          </Button>
        </div>
      ) : null}

      <div className="relative z-10 mt-12 flex items-center gap-3">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#ff751f]" />
        <span className="text-muted-foreground text-[0.6875rem] font-semibold tracking-[0.05em] uppercase">
          {error ? (
            <span className="text-destructive font-bold">{error}</span>
          ) : action ? (
            "Awaiting authorization details"
          ) : (
            "Waiting for authorization"
          )}
        </span>
      </div>

      <footer className="relative z-10 mt-12 flex w-full flex-col items-center gap-6 p-8 pb-12">
        {!action ? (
          <Button
            onClick={() => router.push("/settings/workspace")}
            className="w-full max-w-md rounded-lg bg-[#ff751f] px-8 py-5 text-sm font-semibold tracking-wide text-white transition-all duration-200 hover:opacity-90 active:scale-95"
          >
            I HAVE CONFIRMED
          </Button>
        ) : null}
        <Button
          onClick={() => window.location.reload()}
          className="text-muted-foreground hover:text-foreground text-[0.6875rem] font-semibold tracking-[0.05em] transition-colors"
        >
          Refresh status
        </Button>
      </footer>
    </main>
  );
}

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="bg-background fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden">
          <Loader2 className="h-8 w-8 animate-spin text-[#ff751f]" />
        </div>
      }
    >
      <VerifyContent />
    </Suspense>
  );
}
