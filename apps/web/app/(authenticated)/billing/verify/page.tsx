"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnimatedShinyText } from "@/components/ui/animated-shiny-text";

function VerifyContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const chargeId = searchParams.get("chargeId");
  const method = searchParams.get("method");

  const [status, setStatus] = useState<string>("processing");
  const [error, setError] = useState<string | null>(null);
  const [retries, setRetries] = useState(0);

  useEffect(() => {
    if (!chargeId) {
      setError("Missing chargeId parameter.");
      return;
    }

    let intervalId: NodeJS.Timeout | string | number;

    const checkStatus = async () => {
      try {
        const response = await fetch(
          "/api/v1/payments/verify?chargeId=" + chargeId
        );
        const data = await response.json();

        if (response.ok && data.success) {
          clearInterval(intervalId);
          router.push(
            `/billing/success?payment_session_id=${data.paymentSessionId}${method ? `&method=${method}` : ""}`
          );
        } else if (response.status === 404) {
          setRetries((r) => r + 1);
        } else if (data.status === "failed") {
          clearInterval(intervalId);
          setError("Verification failed.");
        }
      } catch (err) {
        console.error("Polling error:", err);
      }
    };

    intervalId = setInterval(checkStatus, 5000);
    checkStatus();

    return () => clearInterval(intervalId);
  }, [chargeId, router]);

  return (
    <main className="bg-background fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden px-8 text-center">
      {/* Background abstraction */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-1/4 -right-1/4 h-[600px] w-[600px] rounded-full bg-[#ff751f]/5 blur-[120px]"></div>
        <div className="bg-foreground/5 absolute -bottom-1/4 -left-1/4 h-[600px] w-[600px] rounded-full blur-[120px]"></div>
      </div>

      {/* Large Minimalist Loading Animation/Icon */}

      {/* Typography */}
      <div className="z-10 mb-6">
        <AnimatedShinyText className="text-foreground/80 hover:text-foreground inline-flex items-center justify-center rounded-full transition-all duration-500 ease-in hover:cursor-pointer">
          <h1 className="text-[3.5rem] leading-none font-medium tracking-tight">
            Verify on your phone
          </h1>
        </AnimatedShinyText>
      </div>

      <p className="text-muted-foreground relative z-10 mx-auto max-w-md text-lg leading-relaxed font-light">
        Please check your mobile device to authorize the transaction. This
        screen will update automatically.
      </p>

      {/* Status Micro-data */}
      <div className="relative z-10 mt-12 flex items-center gap-3">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#ff751f]"></span>
        <span className="text-muted-foreground text-[0.6875rem] font-semibold tracking-[0.05em] uppercase">
          {error ? (
            <span className="text-destructive font-bold">{error}</span>
          ) : (
            "Waiting for authorization"
          )}
        </span>
      </div>

      <footer className="relative z-10 mt-12 flex w-full flex-col items-center gap-6 p-8 pb-12">
        <Button
          onClick={() => router.push("/settings/workspace")}
          className="w-full max-w-md rounded-lg bg-[#ff751f] px-8 py-5 text-sm font-semibold tracking-wide text-white transition-all duration-200 hover:opacity-90 active:scale-95"
        >
          I HAVE CONFIRMED
        </Button>
        <Button
          onClick={() => window.location.reload()}
          className="text-muted-foreground hover:text-foreground text-[0.6875rem] font-semibold tracking-[0.05em] transition-colors"
        >
          Resend Prompt
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
