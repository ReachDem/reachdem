"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";

function BillingSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const method = searchParams.get("method");
  const isCardPayment = method === "card";

  return (
    <main className="bg-background fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden px-8 text-center">
      {/* Container */}
      <div className="animate-in fade-in slide-in-from-bottom-4 relative z-10 mx-auto flex w-full max-w-sm flex-col items-center duration-500">
        {/* Success Icon */}
        <div className="bg-foreground text-background mb-8 flex h-[3.25rem] w-[3.25rem] items-center justify-center rounded-full">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="h-8 w-8 font-bold"
          >
            <path
              fillRule="evenodd"
              d="M19.916 4.626a.75.75 0 0 1 .208 1.04l-9 13.5a.75.75 0 0 1-1.154.114l-6-6a.75.75 0 0 1 1.06-1.06l5.353 5.353 8.493-12.74a.75.75 0 0 1 1.04-.207Z"
              clipRule="evenodd"
              strokeWidth="1"
              stroke="currentColor"
            />
          </svg>
        </div>

        {/* Typography */}
        <h1 className="text-foreground mb-4 text-5xl font-medium tracking-tight">
          Payment received
        </h1>
        <p className="text-muted-foreground mb-16">
          {isCardPayment
            ? "You're all set. Next time, checkout will feel even faster."
            : "Your payment was successful."}
        </p>

        <div className="mt-4 flex w-full flex-col items-center gap-4">
          <Button
            onClick={() =>
              router.push(
                method === "card" ? "/settings/workspace" : "/campaigns/new"
              )
            }
            className="h-[3.5rem] w-full rounded-md border-none bg-[#ff751f] font-medium text-white transition-all hover:bg-[#e66a1c] active:scale-[0.98]"
          >
            {method === "card" ? "Back to workspace" : "Create your campaign"}
          </Button>
          <button
            onClick={() => router.push("/settings/workspace")}
            className="text-muted-foreground hover:text-foreground text-sm font-medium underline-offset-4 transition-colors hover:underline"
          >
            Go to dashboard
          </button>
        </div>
      </div>

      {/* Footer minimal info */}
      <div className="text-muted-foreground border-border absolute right-8 bottom-8 left-8 flex items-center justify-between border-t pt-8 text-[0.625rem] font-semibold tracking-widest uppercase">
        <span>© 2024 REACHDEM. MINIMALIST AUTHORITY.</span>
        <div className="flex gap-6">
          <span className="hover:text-foreground cursor-pointer transition-colors">
            Terms
          </span>
          <span className="hover:text-foreground cursor-pointer transition-colors">
            Privacy
          </span>
          <span className="hover:text-foreground cursor-pointer transition-colors">
            Support
          </span>
        </div>
      </div>
    </main>
  );
}

export default function BillingSuccessPage() {
  return (
    <Suspense fallback={<div className="bg-background min-h-screen" />}>
      <BillingSuccessContent />
    </Suspense>
  );
}
