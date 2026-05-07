"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { WorkspaceBillingSummary } from "@reachdem/shared";
import { normalizePaymentCustomerName } from "@reachdem/shared";
import { useSession } from "@reachdem/auth/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { usePayment } from "@/hooks/use-payment";

const NETWORKS_BY_COUNTRY: Record<string, { label: string; value: string }[]> =
  {
    CM: [
      { label: "MTN Cameroon", value: "MTN" },
      { label: "Orange Cameroon", value: "ORANGE" },
    ],
    CI: [
      { label: "MTN Côte d'Ivoire", value: "MTN" },
      { label: "Orange CI", value: "ORANGE" },
      { label: "Moov", value: "MOOV" },
    ],
    SN: [
      { label: "Orange Senegal", value: "ORANGE" },
      { label: "Free Senegal", value: "FREE" },
    ],
    NG: [
      { label: "MTN Nigeria", value: "MTN" },
      { label: "Airtel Nigeria", value: "AIRTEL" },
      { label: "Glo Nigeria", value: "GLO" },
    ],
    UG: [
      { label: "MTN Uganda", value: "MTN" },
      { label: "Airtel Uganda", value: "AIRTEL" },
    ],
  };

const COUNTRY_CONFIG = {
  CM: { name: "Cameroon", currency: "XAF", phoneCode: "237" },
  CI: { name: "Ivory Coast", currency: "XOF", phoneCode: "225" },
  SN: { name: "Senegal", currency: "XOF", phoneCode: "221" },
  NG: { name: "Nigeria", currency: "NGN", phoneCode: "234" },
  UG: { name: "Uganda", currency: "UGX", phoneCode: "256" },
} as const;

type CountryCode = keyof typeof COUNTRY_CONFIG;

const CM_MTN_PREFIXES = [
  "650",
  "651",
  "652",
  "653",
  "654",
  "670",
  "671",
  "672",
  "673",
  "674",
  "675",
  "676",
  "677",
  "678",
  "679",
  "680",
  "681",
  "682",
  "683",
];
const CM_ORANGE_PREFIXES = [
  "655",
  "656",
  "657",
  "658",
  "659",
  "690",
  "691",
  "692",
  "693",
  "694",
  "695",
  "696",
  "697",
  "698",
  "699",
  "686",
  "687",
  "688",
  "689",
  "640",
];

function detectCameroonOperator(phoneDigits: string): "MTN" | "ORANGE" | null {
  const normalized = phoneDigits.replace(/\D/g, "").replace(/^237/, "");
  if (normalized.length < 3 || normalized[0] !== "6") return null;
  const prefix = normalized.substring(0, 3);
  if (CM_MTN_PREFIXES.includes(prefix)) return "MTN";
  if (CM_ORANGE_PREFIXES.includes(prefix)) return "ORANGE";
  return null;
}

function getDefaultCountry(currency: string): CountryCode {
  const match = Object.entries(COUNTRY_CONFIG).find(
    ([, cfg]) => cfg.currency === currency
  );
  return (match?.[0] as CountryCode) ?? "CM";
}

interface SubscribePlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: {
    code: string;
    name: string;
    currency: string;
    priceMinor: number;
  } | null;
  billing: WorkspaceBillingSummary;
}

function formatMoney(amountMinor: number, currency: string): string {
  const isZeroDecimal = ["XAF", "XOF", "JPY", "KRW", "UGX"].includes(
    currency.toUpperCase()
  );
  const amount = isZeroDecimal ? amountMinor : amountMinor / 100;
  return `${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: isZeroDecimal ? 0 : 2,
    maximumFractionDigits: isZeroDecimal ? 0 : 2,
  }).format(amount)} ${currency}`;
}

export function SubscribePlanDialog({
  open,
  onOpenChange,
  plan,
  billing,
}: SubscribePlanDialogProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const { paymentState, initiatePayment, setPaymentState } = usePayment();

  const defaultCountry = plan ? getDefaultCountry(plan.currency) : "CM";
  const [selectedCountry, setSelectedCountry] =
    useState<CountryCode>(defaultCountry);
  const [phone, setPhone] = useState("");
  const [network, setNetwork] = useState(
    NETWORKS_BY_COUNTRY[defaultCountry]?.[0]?.value ?? "MTN"
  );
  const [fullName, setFullName] = useState(session?.user?.name ?? "");

  const activeCountry = COUNTRY_CONFIG[selectedCountry];
  const networks = NETWORKS_BY_COUNTRY[selectedCountry] ?? [];
  const isProcessing = paymentState.status === "loading";

  useEffect(() => {
    if (session?.user?.name) {
      setFullName((prev) => prev || session.user.name || "");
    }
  }, [session?.user?.name]);

  useEffect(() => {
    if (!open) {
      setPhone("");
      setFullName(session?.user?.name ?? "");
      setSelectedCountry(plan ? getDefaultCountry(plan.currency) : "CM");
      setNetwork(
        NETWORKS_BY_COUNTRY[plan ? getDefaultCountry(plan.currency) : "CM"]?.[0]
          ?.value ?? "MTN"
      );
      setPaymentState({ status: "idle" });
    }
  }, [open, plan, session?.user?.name, setPaymentState]);

  useEffect(() => {
    if (selectedCountry !== "CM" || !phone) return;
    const detected = detectCameroonOperator(phone);
    if (detected) {
      setNetwork(detected);
    }
  }, [phone, selectedCountry]);

  useEffect(() => {
    if (paymentState.status === "success") {
      onOpenChange(false);
      router.push("/billing/success?method=subscription");
      return;
    }

    const nextActionType =
      paymentState.nextAction &&
      typeof paymentState.nextAction === "object" &&
      "type" in paymentState.nextAction &&
      typeof paymentState.nextAction.type === "string"
        ? paymentState.nextAction.type
        : null;

    if (nextActionType === "redirect_url") {
      // usePayment already handles the redirect; just close dialog
      onOpenChange(false);
      return;
    }

    if (paymentState.chargeId && paymentState.status === "verifying") {
      onOpenChange(false);
      router.push(
        `/billing/verify?chargeId=${paymentState.chargeId}&method=subscription`
      );
      return;
    }

    if (paymentState.chargeId && paymentState.status === "requires_action") {
      const actionQuery =
        nextActionType && nextActionType !== "payment_instruction"
          ? `&action=${nextActionType}`
          : "";
      onOpenChange(false);
      router.push(
        `/billing/verify?chargeId=${paymentState.chargeId}&method=subscription${actionQuery}`
      );
    }
  }, [
    onOpenChange,
    paymentState.chargeId,
    paymentState.nextAction,
    paymentState.status,
    router,
  ]);

  const handleSubmit = async () => {
    if (!plan || !session?.user) return;

    if (!fullName.trim()) {
      toast.error("Please enter your name.");
      return;
    }

    if (!phone.trim()) {
      toast.error("Please enter your mobile money phone number.");
      return;
    }

    if (!network) {
      toast.error("Please select your mobile money network.");
      return;
    }

    const { first: firstName, last: lastName } =
      normalizePaymentCustomerName(fullName);

    await initiatePayment({
      kind: "subscription",
      planCode: plan.code as any,
      currency: plan.currency,
      paymentMethodType: "mobile_money",
      email: session.user.email ?? "payments@reachdem.local",
      customerName: { first: firstName, last: lastName },
      phone: {
        countryCode: activeCountry.phoneCode,
        number: phone.replace(/\D/g, ""),
      },
      mobileMoneyNetwork: network,
      organizationId: billing.organizationId,
    });

    if (paymentState.status === "error") {
      toast.error(paymentState.errorMessage ?? "Payment could not be started.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm border-neutral-800 bg-[#121212] p-0 text-white">
        <DialogHeader className="border-b border-white/5 p-6 pb-4">
          <DialogTitle className="text-xl">Upgrade to {plan?.name}</DialogTitle>
          <DialogDescription className="mt-1 text-sm text-neutral-400">
            Pay {plan ? formatMoney(plan.priceMinor, plan.currency) : ""} /
            month via mobile money.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 p-6 pt-4">
          {paymentState.status === "error" ? (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {paymentState.errorMessage ?? "Payment failed. Please try again."}
            </div>
          ) : null}

          {/* Country */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium tracking-wide text-neutral-400 uppercase">
              Country
            </label>
            <Select
              value={selectedCountry}
              onValueChange={(val) => {
                const code = val as CountryCode;
                setSelectedCountry(code);
                setNetwork(NETWORKS_BY_COUNTRY[code]?.[0]?.value ?? "MTN");
              }}
            >
              <SelectTrigger className="border-white/10 bg-white/5 text-white focus:ring-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-neutral-700 bg-[#1c1c1c]">
                {Object.entries(COUNTRY_CONFIG).map(([code, cfg]) => (
                  <SelectItem
                    key={code}
                    value={code}
                    className="text-white focus:bg-white/10"
                  >
                    {cfg.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Network */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium tracking-wide text-neutral-400 uppercase">
              Network
            </label>
            <Select value={network} onValueChange={setNetwork}>
              <SelectTrigger className="border-white/10 bg-white/5 text-white focus:ring-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-neutral-700 bg-[#1c1c1c]">
                {networks.map((n) => (
                  <SelectItem
                    key={n.value}
                    value={n.value}
                    className="text-white focus:bg-white/10"
                  >
                    {n.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Phone */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium tracking-wide text-neutral-400 uppercase">
              Mobile Money Number
            </label>
            <div className="flex items-center gap-2">
              <select
                value={selectedCountry}
                onChange={(e) => {
                  const code = e.target.value as CountryCode;
                  setSelectedCountry(code);
                  setNetwork(NETWORKS_BY_COUNTRY[code]?.[0]?.value ?? "MTN");
                }}
                className="inline-flex h-9 appearance-none items-center rounded-md border border-white/10 bg-white/5 px-3 pr-6 text-sm text-neutral-400 focus:outline-none"
              >
                {Object.entries(COUNTRY_CONFIG).map(([code, cfg]) => (
                  <option
                    key={code}
                    value={code}
                    className="bg-[#1c1c1c] text-white"
                  >
                    +{cfg.phoneCode}
                  </option>
                ))}
              </select>
              <Input
                type="tel"
                inputMode="numeric"
                placeholder="670000000"
                value={phone}
                onChange={(e) =>
                  setPhone(e.target.value.replace(/[^\d\s\-]/g, ""))
                }
                className="border-white/10 bg-white/5 text-white placeholder:text-neutral-600 focus-visible:ring-0"
              />
            </div>
            {selectedCountry === "CM" &&
            phone &&
            detectCameroonOperator(phone) ? (
              <p className="text-xs text-neutral-400">
                Detected:{" "}
                <span className="font-medium text-white">
                  {detectCameroonOperator(phone) === "MTN"
                    ? "MTN Mobile Money"
                    : "Orange Money"}
                </span>
              </p>
            ) : null}
          </div>

          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium tracking-wide text-neutral-400 uppercase">
              Full Name
            </label>
            <Input
              type="text"
              placeholder="Your name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="border-white/10 bg-white/5 text-white placeholder:text-neutral-600 focus-visible:ring-0"
            />
          </div>

          <Button
            className="mt-2 h-11 w-full bg-[#f58220] font-medium text-white hover:bg-[#d6701a] disabled:opacity-60"
            disabled={isProcessing}
            onClick={() => void handleSubmit()}
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing…
              </>
            ) : (
              `Pay ${plan ? formatMoney(plan.priceMinor, plan.currency) : ""}`
            )}
          </Button>

          <p className="text-center text-xs text-neutral-500">
            A push notification or USSD prompt will be sent to your phone to
            confirm payment.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
