"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, Loader2, Plus, Gift } from "lucide-react";
import { toast } from "sonner";
import type {
  CreditPricing,
  PaymentSessionDetailsResponse,
  WorkspaceBillingSummary,
} from "@reachdem/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  SettingsCard,
  SettingsCardContent,
  SettingsCardDescription,
  SettingsCardHeader,
  SettingsCardTitle,
} from "@/components/settings-card";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  CreditCardIcon,
  DevicePhoneMobileIcon,
  BriefcaseIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";
import { usePayment } from "@/hooks/usePayment";
import { useSession } from "@reachdem/auth/client";

const COUNTRY_CONFIG = {
  CM: { name: "Cameroon", currency: "XAF", phoneCode: "237" },
  NG: { name: "Nigeria", currency: "NGN", phoneCode: "234" },
  UG: { name: "Uganda", currency: "UGX", phoneCode: "256" },
  SN: { name: "Senegal", currency: "XOF", phoneCode: "221" },
};

function TopUpModal({ billing }: { billing: WorkspaceBillingSummary }) {
  const { data: session } = useSession();
  const router = useRouter();

  const [amount, setAmount] = useState<string>("5000");
  const [selectedCountry, setSelectedCountry] =
    useState<keyof typeof COUNTRY_CONFIG>("CM");
  const [selectedMethod, setSelectedMethod] = useState<
    "card" | "mobile_money" | "opay" | null
  >("card");

  const [network, setNetwork] = useState("MTN");
  const [phone, setPhone] = useState("");
  const [fullName, setFullName] = useState(session?.user?.name || "");
  const [addressLine1, setAddressLine1] = useState("");
  const [isBusiness, setIsBusiness] = useState(false);

  const { paymentState, initiatePayment } = usePayment();

  const activeCurrency = COUNTRY_CONFIG[selectedCountry].currency;
  const activePhoneCode = COUNTRY_CONFIG[selectedCountry].phoneCode;

  useEffect(() => {
    if (selectedMethod === "opay" && selectedCountry !== "NG") {
      setSelectedCountry("NG");
    }
  }, [selectedCountry, selectedMethod]);

  useEffect(() => {
    if (paymentState.status === "success") {
      router.push(`/billing/success?method=${selectedMethod}`);
    } else if (
      (paymentState.status === "requires_action" ||
        paymentState.status === "verifying") &&
      paymentState.chargeId
    ) {
      router.push(
        `/billing/verify?chargeId=${paymentState.chargeId}&method=${selectedMethod}`
      );
    }
  }, [paymentState.status, paymentState.chargeId, router, selectedMethod]);

  const handleSubmit = (method: string) => {
    if (!session?.user || !billing?.organizationId) return;

    const nameParts = session.user.name?.split(" ") || [];

    initiatePayment({
      kind: "creditPurchase",
      organizationId: billing.organizationId,
      currency: activeCurrency,
      creditsQuantity: Math.max(
        10,
        Math.floor((parseInt(amount, 10) || 0) / 10)
      ),
      paymentMethodType: method as "card" | "mobile_money" | "opay",
      customerName: {
        first: nameParts[0] || "User",
        last: nameParts.slice(1).join(" ") || "Reachdem",
      },
      email: session.user.email || "support@reachdem.com",
      phone: {
        countryCode: activePhoneCode,
        number: phone.replace(/\D/g, ""),
      },
      mobileMoneyNetwork: method === "mobile_money" ? network : undefined,
    });
  };

  const isProcessing = paymentState.status === "loading";

  return (
    <div className="animate-in fade-in space-y-6">
      <div className="space-y-2">
        <label className="flex w-full items-center justify-between text-sm font-semibold text-white">
          <span>Amount ({activeCurrency})</span>
          <select
            value={selectedCountry}
            onChange={(e) =>
              setSelectedCountry(e.target.value as keyof typeof COUNTRY_CONFIG)
            }
            className="cursor-pointer bg-transparent text-right text-sm font-medium text-neutral-400 transition-colors hover:text-white focus:outline-none"
          >
            {Object.entries(COUNTRY_CONFIG).map(([code, config]) => (
              <option key={code} value={code} className="bg-[#111] text-white">
                {config.name}
              </option>
            ))}
          </select>
        </label>
        <Input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="h-12 border border-[#2a2a2a] bg-[#111] text-lg text-white transition-colors focus-visible:ring-1 focus-visible:ring-[#333]"
          placeholder="100"
          disabled={isProcessing}
        />
        <p className="text-xs text-neutral-500">
          Please ensure amounts are valid for your region.
        </p>
      </div>

      <div className="space-y-3">
        <div className="overflow-hidden rounded-xl border border-[#2a2a2a] bg-transparent transition-colors">
          <button
            type="button"
            onClick={() =>
              setSelectedMethod(selectedMethod === "card" ? null : "card")
            }
            className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-white/[0.02]"
          >
            <div className="flex items-center gap-3 text-sm font-medium text-white">
              <CreditCardIcon className="h-5 w-5 text-neutral-400" />
              Debit or Credit Card
            </div>
            <ChevronDownIcon
              className={`h-5 w-5 text-neutral-500 transition-transform duration-200 ${selectedMethod === "card" ? "rotate-180" : ""}`}
            />
          </button>

          {selectedMethod === "card" && (
            <div className="animate-in slide-in-from-top-2 space-y-4 px-5 pt-4 pb-5 duration-200">
              <p className="mb-4 text-xs text-neutral-400">
                Please provide your billing address.
              </p>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-neutral-300">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Jane Doe"
                    className="w-full rounded-lg border border-[#333] bg-transparent px-3 py-2.5 text-sm text-white transition-colors placeholder:text-neutral-500 focus:border-[#555] focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-neutral-300">
                    Country or Region
                  </label>
                  <div className="relative">
                    <select
                      value={selectedCountry}
                      onChange={(e) =>
                        setSelectedCountry(e.target.value as any)
                      }
                      className="w-full appearance-none rounded-lg border border-[#333] bg-transparent px-3 py-2.5 pr-10 text-sm text-white transition-colors focus:border-[#555] focus:outline-none"
                    >
                      <option value="CM" className="bg-[#111] text-white">
                        Cameroon
                      </option>
                      <option value="NG" className="bg-[#111] text-white">
                        Nigeria
                      </option>
                      <option value="UG" className="bg-[#111] text-white">
                        Uganda
                      </option>
                      <option value="SN" className="bg-[#111] text-white">
                        Senegal
                      </option>
                      <option value="CI" className="bg-[#111] text-white">
                        Ivory Coast
                      </option>
                      <option value="US" className="bg-[#111] text-white">
                        United States
                      </option>
                      <option value="FR" className="bg-[#111] text-white">
                        France
                      </option>
                    </select>
                    <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-neutral-500" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-neutral-300">
                    Address - Line 1
                  </label>
                  <input
                    type="text"
                    value={addressLine1}
                    onChange={(e) => setAddressLine1(e.target.value)}
                    placeholder="ex: 123 Rue de la Paix"
                    className="w-full rounded-lg border border-[#333] bg-transparent px-3 py-2.5 text-sm text-white transition-colors placeholder:text-neutral-500 focus:border-[#555] focus:outline-none"
                  />
                </div>
              </div>

              <div className="mt-6 border-t border-[#222] pt-4">
                <p className="mb-3 text-xs text-neutral-400">Card details</p>
                <div className="pointer-events-none space-y-3 opacity-50">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Card number"
                      className="w-full rounded-lg border border-[#333] bg-transparent px-3 py-3 pl-10 text-sm text-white focus:outline-none"
                      readOnly
                    />
                    <CreditCardIcon className="absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-neutral-500" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="Expiration"
                      className="rounded-lg border border-[#333] bg-transparent px-3 py-3 text-sm text-white focus:outline-none"
                      readOnly
                    />
                    <input
                      type="text"
                      placeholder="CVC"
                      className="rounded-lg border border-[#333] bg-transparent px-3 py-3 text-sm text-white focus:outline-none"
                      readOnly
                    />
                  </div>
                </div>
              </div>

              <Button
                onClick={() => handleSubmit("card")}
                disabled={isProcessing || !amount || !fullName || !addressLine1}
                className="mt-6 h-11 w-full bg-[#0e8a5b] font-medium text-white shadow-none transition-colors hover:bg-[#0c7a50]"
              >
                {isProcessing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  "Continue"
                )}
              </Button>
            </div>
          )}
        </div>

        <div className="overflow-hidden rounded-xl border border-[#2a2a2a] bg-transparent transition-colors">
          <button
            type="button"
            onClick={() =>
              setSelectedMethod(
                selectedMethod === "mobile_money" ? null : "mobile_money"
              )
            }
            className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-white/[0.02]"
          >
            <div className="flex items-center gap-3 text-sm font-medium text-white">
              <DevicePhoneMobileIcon className="h-5 w-5 text-neutral-400" />
              Mobile Money
            </div>
            <ChevronDownIcon
              className={`h-5 w-5 text-neutral-500 transition-transform duration-200 ${selectedMethod === "mobile_money" ? "rotate-180" : ""}`}
            />
          </button>

          {selectedMethod === "mobile_money" && (
            <div className="animate-in slide-in-from-top-2 space-y-4 px-5 pt-4 pb-5 duration-200">
              <div className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-neutral-300">
                    Network
                  </label>
                  <div className="relative">
                    <select
                      value={network}
                      onChange={(e) => setNetwork(e.target.value)}
                      className="w-full appearance-none rounded-lg border border-[#333] bg-transparent px-3 py-2.5 pr-10 text-sm text-white transition-colors focus:border-[#555] focus:outline-none"
                    >
                      <option value="MTN" className="bg-[#111] text-white">
                        MTN Mobile Money
                      </option>
                      <option value="ORANGE" className="bg-[#111] text-white">
                        Orange Money
                      </option>
                      <option value="AIRTEL" className="bg-[#111] text-white">
                        Airtel Money
                      </option>
                      <option value="MPESA" className="bg-[#111] text-white">
                        M-Pesa
                      </option>
                    </select>
                    <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-neutral-500" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-neutral-300">
                    Phone number
                  </label>
                  <div className="flex gap-2">
                    <div className="flex shrink-0 items-center rounded-lg border border-[#333] bg-transparent px-3 py-2.5 text-sm text-neutral-400">
                      +{activePhoneCode}
                    </div>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) =>
                        setPhone(e.target.value.replace(/\D/g, ""))
                      }
                      placeholder="6XXXXXXXX"
                      className="w-full rounded-lg border border-[#333] bg-transparent px-3 py-2.5 text-sm text-white transition-colors placeholder:text-neutral-500 focus:border-[#555] focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <Button
                onClick={() => handleSubmit("mobile_money")}
                disabled={isProcessing || !amount || !phone}
                className="mt-6 h-11 w-full bg-[#0e8a5b] font-medium text-white shadow-none transition-colors hover:bg-[#0c7a50]"
              >
                {isProcessing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  "Continue"
                )}
              </Button>
            </div>
          )}
        </div>

        <div className="overflow-hidden rounded-xl border border-[#2a2a2a] bg-transparent transition-colors">
          <button
            type="button"
            onClick={() =>
              setSelectedMethod(selectedMethod === "opay" ? null : "opay")
            }
            className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-white/[0.02]"
          >
            <div className="flex items-center gap-3 text-sm font-medium text-white">
              <BriefcaseIcon className="h-5 w-5 text-neutral-400" />
              OPay Account
            </div>
            <ChevronDownIcon
              className={`h-5 w-5 text-neutral-500 transition-transform duration-200 ${selectedMethod === "opay" ? "rotate-180" : ""}`}
            />
          </button>

          {selectedMethod === "opay" && (
            <div className="animate-in slide-in-from-top-2 space-y-4 px-5 pt-2 pb-5 duration-200">
              <p className="text-sm text-neutral-400">
                OPay is available for Nigeria only. Enter your Nigerian phone
                number without the `+234` prefix before continuing.
              </p>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-neutral-300">
                  Nigerian phone number
                </label>
                <div className="flex gap-2">
                  <div className="flex shrink-0 items-center rounded-lg border border-[#333] bg-transparent px-3 py-2.5 text-sm text-neutral-400">
                    +{activePhoneCode}
                  </div>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) =>
                      setPhone(e.target.value.replace(/\D/g, ""))
                    }
                    placeholder="8012345678"
                    className="w-full rounded-lg border border-[#333] bg-transparent px-3 py-2.5 text-sm text-white transition-colors placeholder:text-neutral-500 focus:border-[#555] focus:outline-none"
                  />
                </div>
              </div>
              <Button
                onClick={() => handleSubmit("opay")}
                disabled={
                  isProcessing || !amount || !phone || selectedCountry !== "NG"
                }
                className="h-11 w-full bg-[#0e8a5b] font-medium text-white shadow-none transition-colors hover:bg-[#0c7a50]"
              >
                {isProcessing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  "Continue to OPay"
                )}
              </Button>
            </div>
          )}
        </div>
      </div>

      {paymentState.status === "error" && (
        <div className="animate-in fade-in flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
          <ShieldCheckIcon className="h-5 w-5 shrink-0" />
          <p>
            <strong>Failed:</strong> {paymentState.errorMessage}
          </p>
        </div>
      )}
    </div>
  );
}

interface BillingWorkspacePanelProps {
  billing: WorkspaceBillingSummary | null;
}

function formatMoney(amountMinor: number, currency: string): string {
  return `${new Intl.NumberFormat("en-US").format(amountMinor)} ${currency}`;
}

function getApplicableTier(pricing: CreditPricing, quantity: number) {
  return [...pricing.tiers]
    .sort((left, right) => right.minimumQuantity - left.minimumQuantity)
    .find((tier) => quantity >= tier.minimumQuantity);
}

function extractPaymentSessionIdFromReference(
  reference: string | null
): string | null {
  if (!reference || !reference.startsWith("pay_")) {
    return null;
  }

  return reference.slice(4) || null;
}

export function BillingWorkspacePanel({ billing }: BillingWorkspacePanelProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const handledSessionRef = useRef<string | null>(null);
  const [isNavigating, startTransition] = useTransition();
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [creditsQuantity, setCreditsQuantity] = useState(
    billing?.creditPricing.suggestedQuantities[0] ??
      billing?.creditPricing.minimumQuantity ??
      250
  );
  const [paymentFeedback, setPaymentFeedback] = useState<{
    tone: "neutral" | "success" | "danger";
    title: string;
    description: string;
  } | null>(null);

  useEffect(() => {
    if (!billing) {
      return;
    }

    if (creditsQuantity < billing.creditPricing.minimumQuantity) {
      setCreditsQuantity(billing.creditPricing.minimumQuantity);
    }
  }, [billing, creditsQuantity]);

  const paymentSessionId =
    searchParams.get("payment_session_id") ??
    extractPaymentSessionIdFromReference(searchParams.get("tx_ref"));
  const provider = searchParams.get("provider") ?? undefined;
  const providerReference = searchParams.get("tx_ref") ?? undefined;
  const providerTransactionId = searchParams.get("transaction_id") ?? undefined;
  const returnedStatus = searchParams.get("status") ?? undefined;
  const cancelled = searchParams.get("cancelled") === "true";

  useEffect(() => {
    if (!paymentSessionId || handledSessionRef.current === paymentSessionId) {
      return;
    }

    handledSessionRef.current = paymentSessionId;

    const reconcile = async () => {
      try {
        const response = await fetch(
          `/api/v1/payments/session/${paymentSessionId}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              provider,
              providerReference,
              providerTransactionId,
              status: returnedStatus,
              cancelled,
            }),
          }
        );

        if (!response.ok) {
          throw new Error("Unable to confirm payment status");
        }

        const payload =
          (await response.json()) as PaymentSessionDetailsResponse;
        const status = payload.session.status;

        if (status === "succeeded") {
          setPaymentFeedback({
            tone: "success",
            title: "Payment confirmed",
            description:
              "Your workspace has been updated and the purchased credits or plan are now active.",
          });
          toast.success("Payment confirmed successfully.");
        } else if (status === "failed") {
          setPaymentFeedback({
            tone: "danger",
            title: "Payment failed",
            description:
              "The transaction did not complete. You can retry the payment from this screen.",
          });
          toast.error("The payment could not be confirmed.");
        } else if (status === "cancelled") {
          setPaymentFeedback({
            tone: "neutral",
            title: "Payment cancelled",
            description:
              "The checkout was cancelled before confirmation. No charge was applied on ReachDem.",
          });
          toast.info("Payment cancelled.");
        } else {
          setPaymentFeedback({
            tone: "neutral",
            title: "Payment processing",
            description:
              "We are still waiting for the final provider confirmation. Refresh in a moment if this persists.",
          });
          toast.info("Payment is still being processed.");
        }

        startTransition(() => {
          router.replace("/settings/workspace");
          router.refresh();
        });
      } catch {
        handledSessionRef.current = null;
        toast.error("We could not reconcile the payment yet.");
      }
    };

    void reconcile();
  }, [
    cancelled,
    paymentSessionId,
    provider,
    providerReference,
    providerTransactionId,
    returnedStatus,
    router,
  ]);

  if (!billing) {
    return (
      <SettingsCard>
        <SettingsCardHeader>
          <SettingsCardTitle>Billing</SettingsCardTitle>
          <SettingsCardDescription>
            Unable to load workspace billing details right now.
          </SettingsCardDescription>
        </SettingsCardHeader>
      </SettingsCard>
    );
  }

  const verificationLabel =
    billing.workspaceVerificationStatus === "verified"
      ? "Verified"
      : billing.workspaceVerificationStatus.replace(/_/g, " ");
  const standardPlans = billing.availablePlans.filter(
    (plan) => !plan.contactSales && plan.priceMinor != null
  );
  const customPlan = billing.availablePlans.find(
    (plan) => plan.contactSales || plan.priceMinor == null
  );
  const pricingTier =
    getApplicableTier(billing.creditPricing, creditsQuantity) ??
    billing.creditPricing.tiers[0];
  const topUpTotal = pricingTier.unitAmountMinor * creditsQuantity;

  const createCheckoutSession = async (payload: {
    kind: "subscription" | "creditPurchase";
    currency: string;
    planCode?: string;
    creditsQuantity?: number;
    busyKey: string;
  }) => {
    try {
      setBusyKey(payload.busyKey);

      const response = await fetch("/api/v1/payments/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          kind: payload.kind,
          currency: payload.currency,
          planCode: payload.planCode,
          creditsQuantity: payload.creditsQuantity,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to create payment session");
      }

      if (!result.checkoutUrl) {
        throw new Error("Provider checkout URL is missing");
      }

      window.location.assign(result.checkoutUrl);
    } catch (error: any) {
      toast.error(error.message ?? "Unable to start checkout.");
      setBusyKey(null);
    }
  };

  return (
    <div className="space-y-8">
      <SettingsCard>
        <SettingsCardHeader>
          <SettingsCardTitle>Plan</SettingsCardTitle>
          <SettingsCardDescription>
            Manage your current subscription and switch plans without leaving
            the workspace.
          </SettingsCardDescription>
        </SettingsCardHeader>
        <SettingsCardContent className="space-y-6 pt-6">
          {paymentFeedback ? (
            <div
              className={
                paymentFeedback.tone === "success"
                  ? "rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4"
                  : paymentFeedback.tone === "danger"
                    ? "rounded-lg border border-red-500/30 bg-red-500/10 p-4"
                    : "border-border bg-muted/20 rounded-lg border p-4"
              }
            >
              <p className="text-sm font-semibold">{paymentFeedback.title}</p>
              <p className="text-muted-foreground mt-1 text-sm">
                {paymentFeedback.description}
              </p>
            </div>
          ) : null}

          <div className="bg-muted/20 grid gap-3 rounded-lg border p-4 md:grid-cols-3">
            <div className="bg-background/80 rounded-md border p-3">
              <p className="text-sm font-medium">Current Plan</p>
              <p className="text-muted-foreground mt-1 text-sm capitalize">
                {billing.planCode}
              </p>
            </div>
            <div className="bg-background/80 rounded-md border p-3">
              <p className="text-sm font-medium">Workspace Verification</p>
              <p className="text-muted-foreground mt-1 text-sm capitalize">
                {verificationLabel}
              </p>
            </div>
            <div className="bg-background/80 rounded-md border p-3">
              <p className="text-sm font-medium">SMS Sender ID</p>
              <p className="text-muted-foreground mt-1 text-sm">
                {billing.senderId ?? "Not assigned"}
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {standardPlans.map((plan) => {
              const isCurrentPlan = billing.planCode === plan.code;
              const isBusy = busyKey === `plan:${plan.code}`;

              return (
                <div
                  key={plan.code}
                  className={
                    plan.highlighted
                      ? "rounded-xl border border-[#f58220]/40 bg-[#f58220]/5 p-5 shadow-sm"
                      : "bg-card rounded-xl border p-5"
                  }
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-lg font-semibold">{plan.name}</h3>
                      {isCurrentPlan ? (
                        <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-700">
                          Current
                        </span>
                      ) : null}
                    </div>
                    <p className="text-muted-foreground text-sm">
                      {plan.description}
                    </p>
                    <p className="text-2xl font-semibold">
                      {plan.priceMinor == null
                        ? "Custom"
                        : formatMoney(plan.priceMinor, plan.currency)}
                      <span className="text-muted-foreground ml-1 text-sm font-normal">
                        {plan.interval === "monthly" ? "/month" : ""}
                      </span>
                    </p>
                  </div>

                  <div className="mt-5 space-y-2">
                    {plan.features.map((feature) => (
                      <div
                        key={feature}
                        className="flex items-start gap-2 text-sm"
                      >
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#f58220]" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6">
                    <Button
                      className="w-full bg-[#f58220] text-white hover:bg-[#d6701a]"
                      disabled={isCurrentPlan || Boolean(busyKey)}
                      onClick={() =>
                        void createCheckoutSession({
                          kind: "subscription",
                          currency: plan.currency,
                          planCode: plan.code,
                          busyKey: `plan:${plan.code}`,
                        })
                      }
                    >
                      {isBusy ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : null}
                      {isCurrentPlan
                        ? "Current plan"
                        : `Upgrade to ${plan.name}`}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {customPlan ? (
            <div className="bg-muted/20 flex flex-col items-start justify-between gap-4 rounded-xl border p-5 md:flex-row md:items-center">
              <div className="space-y-1">
                <p className="text-base font-semibold">
                  Want a customized solution?
                </p>
                <p className="text-muted-foreground text-sm">
                  Talk to sales for custom integrations, compliance needs, and
                  rollout support.
                </p>
              </div>
              <Button asChild variant="outline" className="shrink-0">
                <a
                  href="https://reachdem.cc/pricing"
                  target="_blank"
                  rel="noreferrer"
                >
                  Talk to sales
                </a>
              </Button>
            </div>
          ) : null}
        </SettingsCardContent>
      </SettingsCard>

      <SettingsCard>
        <SettingsCardHeader>
          <SettingsCardTitle>Credits</SettingsCardTitle>
          <SettingsCardDescription>
            Top up message credits and pay only for the volume you plan to send.
          </SettingsCardDescription>
        </SettingsCardHeader>
        <SettingsCardContent className="space-y-6 pt-6">
          <div className="flex flex-col items-start justify-between rounded-xl border border-white/5 bg-[#121212] p-6 shadow-sm md:flex-row md:items-center">
            <div className="mb-4 md:mb-0">
              <p className="text-sm font-semibold tracking-wider text-neutral-400 uppercase">
                Balance
              </p>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-4xl font-bold tracking-tight text-white">
                  {billing.creditBalance.toLocaleString()}
                </span>
                <span className="text-lg font-medium text-neutral-400">
                  credits
                </span>
              </div>
            </div>

            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <Button
                variant="outline"
                className="items-center gap-2 border-white/10 bg-transparent px-5 text-white transition-colors hover:bg-white/5 hover:text-white"
              >
                <Gift className="h-4 w-4" />
                Redeem code
              </Button>
              <Dialog>
                <DialogTrigger asChild>
                  <Button className="items-center gap-2 bg-white px-6 font-medium text-black transition-colors hover:bg-neutral-200">
                    Top up
                  </Button>
                </DialogTrigger>
                <DialogContent className="flex max-h-[90vh] max-w-md flex-col overflow-hidden border-neutral-800 bg-[#121212] p-0 text-white">
                  <DialogHeader className="shrink-0 border-b border-white/5 p-6 pb-2">
                    <DialogTitle className="text-xl">
                      Top Up Credits
                    </DialogTitle>
                    <DialogDescription className="mt-2 text-sm leading-relaxed text-neutral-400">
                      On successful payment, an invoice will be issued and
                      you'll be granted credits. Credits will be applied to
                      future invoices only and are not refundable. The topped up
                      credits do not expire.
                      <br />
                      <br />
                      For larger discounted credit packages, please reach out to
                      us via{" "}
                      <a
                        href="mailto:support@reachdem.com"
                        className="text-white underline underline-offset-4 hover:text-neutral-300"
                      >
                        support
                      </a>
                      .
                    </DialogDescription>
                  </DialogHeader>
                  <div className="overflow-y-auto p-6 pt-4 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-neutral-800 hover:[&::-webkit-scrollbar-thumb]:bg-neutral-700 [&::-webkit-scrollbar-track]:bg-transparent">
                    <TopUpModal billing={billing} />
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <div className="bg-muted/10 mt-4 grid gap-3 rounded-lg border p-4 md:grid-cols-2">
            <div className="bg-background/80 rounded-md border p-3">
              <p className="text-sm font-medium">SMS Included</p>
              <p className="text-muted-foreground mt-1 text-sm">
                {billing.smsIncludedLimit != null
                  ? `${billing.smsQuotaRemaining}/${billing.smsIncludedLimit} remaining`
                  : "Uses shared credits"}
              </p>
            </div>
            <div className="bg-background/80 rounded-md border p-3">
              <p className="text-sm font-medium">Email Included</p>
              <p className="text-muted-foreground mt-1 text-sm">
                {billing.emailIncludedLimit != null
                  ? `${billing.emailQuotaRemaining}/${billing.emailIncludedLimit} remaining`
                  : "Uses shared credits"}
              </p>
            </div>
          </div>
        </SettingsCardContent>
      </SettingsCard>
    </div>
  );
}
