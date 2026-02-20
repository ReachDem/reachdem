"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { checkoutProducts, type ProductBillingType } from "@/lib/payments/products"

declare global {
  interface Window {
    FlutterwaveCheckout?: (config: Record<string, unknown>) => void
  }
}

type ApiResponse = {
  checkoutUrl?: string
  sessionId?: string
  publicKey?: string | null
  error?: string
  checkoutConfig?: {
    tx_ref: string
    amount: number
    currency: string
    redirect_url: string
  }
}

export function PaymentsCheckout() {
  const [loadingType, setLoadingType] = useState<ProductBillingType | null>(null)
  const [error, setError] = useState<string | null>(null)

  const startCheckout = async (productType: ProductBillingType) => {
    try {
      console.log("[Payments UI] Start checkout", { productType })
      setLoadingType(productType)
      setError(null)

      const response = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productType }),
      })

      const json = (await response.json()) as ApiResponse
      console.log("[Payments UI] Checkout API response", {
        ok: response.ok,
        status: response.status,
        hasCheckoutUrl: Boolean(json.checkoutUrl),
        error: json.error,
      })

      if (!response.ok || !json.checkoutUrl) {
        if (!response.ok) {
          throw new Error(json.error || "Impossible de creer la session.")
        }
      }

      if (json.checkoutUrl) {
        console.log("[Payments UI] Redirecting to Flutterwave checkout URL")
        window.location.href = json.checkoutUrl
        return
      }

      const publicKey =
        json.publicKey ||
        process.env.NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY ||
        process.env.NEXT_PUBLIC_FLW_PUBLIC_KEY

      if (!publicKey) {
        throw new Error(
          "Missing NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY (or NEXT_PUBLIC_FLW_PUBLIC_KEY) for inline checkout."
        )
      }

      if (!window.FlutterwaveCheckout || !json.checkoutConfig) {
        throw new Error("Flutterwave script not loaded or checkout config missing.")
      }

      console.log("[Payments UI] Opening inline checkout with session", {
        sessionId: json.sessionId,
      })
      window.FlutterwaveCheckout({
        public_key: publicKey,
        tx_ref: json.checkoutConfig.tx_ref,
        amount: json.checkoutConfig.amount,
        currency: json.checkoutConfig.currency,
        country: "CM",
        payment_options: "card",
        redirect_url: json.checkoutConfig.redirect_url,
        customer: {
          email: "test@reachdem.app",
          name: "ReachDem Test",
          phone_number: "670000000",
        },
        meta: {
          checkout_session_id: json.sessionId || null,
          product_type: productType,
        },
        customizations: {
          title: "ReachDem",
          description: `${json.checkoutConfig.amount} ${json.checkoutConfig.currency}`,
        },
        callback: (data: unknown) => {
          console.log("[Payments UI] Flutterwave callback", data)
        },
        onclose: (incomplete: unknown) => {
          console.log("[Payments UI] Flutterwave modal closed", { incomplete })
        },
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur paiement."
      console.error("[Payments UI] Checkout failed", { message })
      setError(message)
    } finally {
      setLoadingType(null)
    }
  }

  return (
    <div className="mx-auto grid w-full max-w-4xl gap-6 px-6 py-10 md:grid-cols-2">
      {(Object.keys(checkoutProducts) as ProductBillingType[]).map((type) => {
        const product = checkoutProducts[type]
        const isLoading = loadingType === type

        return (
          <section
            key={product.id}
            className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              {product.frequencyLabel}
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-zinc-900">{product.label}</h2>
            <p className="mt-2 text-sm text-zinc-600">{product.description}</p>
            <p className="mt-4 text-3xl font-bold text-zinc-900">
              {product.amount} {product.currency}
            </p>
            <Button
              className="mt-6 w-full bg-zinc-900 text-white hover:bg-zinc-800"
              onClick={() => startCheckout(type)}
              disabled={isLoading}
            >
              {isLoading ? "Redirection..." : `Payer ${product.amount} ${product.currency}`}
            </Button>
          </section>
        )
      })}
      {error ? (
        <p className="md:col-span-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  )
}
