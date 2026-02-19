"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { checkoutProducts, type ProductBillingType } from "@/lib/payments/products"

type InitResponse = {
  customerId?: string
  paymentMethodId?: string
  network?: string
  countryCode?: string
  error?: string
}

type ChargeResponse = {
  reference?: string
  error?: string
  charge?: Record<string, unknown>
}

export function MobileMoneyForm() {
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [network, setNetwork] = useState<"mtn" | "orange">("mtn")
  const [productType, setProductType] = useState<ProductBillingType>("fixed")
  const [customerId, setCustomerId] = useState<string | null>(null)
  const [paymentMethodId, setPaymentMethodId] = useState<string | null>(null)
  const [loadingInit, setLoadingInit] = useState(false)
  const [loadingCharge, setLoadingCharge] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<string | null>(null)

  const onInit = async () => {
    try {
      setLoadingInit(true)
      setError(null)
      setResult(null)

      const response = await fetch("/api/payments/mobile/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          phoneNumber,
          network,
          countryCode: "237",
          productType,
        }),
      })

      const json = (await response.json()) as InitResponse
      console.log("[Mobile UI] Init response", {
        ok: response.ok,
        status: response.status,
        customerId: json.customerId,
        paymentMethodId: json.paymentMethodId,
        error: json.error,
      })

      if (!response.ok || !json.customerId || !json.paymentMethodId) {
        throw new Error(json.error || "Initialisation customer/payment method echouee.")
      }

      setCustomerId(json.customerId)
      setPaymentMethodId(json.paymentMethodId)
      setResult("Customer et moyen de paiement mobile crees. Vous pouvez maintenant lancer le charge.")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur initialisation."
      console.error("[Mobile UI] Init failed", { message })
      setError(message)
    } finally {
      setLoadingInit(false)
    }
  }

  const onCharge = async () => {
    if (!customerId || !paymentMethodId) {
      setError("Initialisez d'abord le customer et le payment method.")
      return
    }

    try {
      setLoadingCharge(true)
      setError(null)
      setResult(null)

      const response = await fetch("/api/payments/mobile/charge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId,
          paymentMethodId,
          productType,
        }),
      })

      const json = (await response.json()) as ChargeResponse
      console.log("[Mobile UI] Charge response", {
        ok: response.ok,
        status: response.status,
        reference: json.reference,
        error: json.error,
      })

      if (!response.ok) {
        throw new Error(json.error || "Charge echoue.")
      }

      setResult(`Charge lance avec reference: ${json.reference || "N/A"}. Verifiez ensuite votre dashboard Flutterwave.`)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur charge."
      console.error("[Mobile UI] Charge failed", { message })
      setError(message)
    } finally {
      setLoadingCharge(false)
    }
  }

  const selectedProduct = checkoutProducts[productType]

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-8">
      <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-semibold text-zinc-900">Mobile Money (v4)</h2>
        <p className="mt-2 text-sm text-zinc-600">
          Etape 1: creation du customer + payment method mobile. Etape 2: charge.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Input
            placeholder="Prenom"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
          <Input
            placeholder="Nom"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            placeholder="Telephone (ex: 670000000)"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
          />
          <select
            className="h-9 rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-900"
            value={network}
            onChange={(e) => setNetwork(e.target.value as "mtn" | "orange")}
          >
            <option value="mtn">MTN</option>
            <option value="orange">Orange</option>
          </select>
          <select
            className="h-9 rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-900"
            value={productType}
            onChange={(e) => setProductType(e.target.value as ProductBillingType)}
          >
            <option value="fixed">Produit fixe (100 XAF)</option>
            <option value="recurring">Produit recurrent (200 XAF)</option>
          </select>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button onClick={onInit} disabled={loadingInit} className="bg-zinc-900 text-white">
            {loadingInit ? "Initialisation..." : "1) Init customer"}
          </Button>
          <Button
            onClick={onCharge}
            disabled={loadingCharge || !customerId || !paymentMethodId}
            className="bg-emerald-700 text-white hover:bg-emerald-600"
          >
            {loadingCharge
              ? "Chargement..."
              : `2) Charger ${selectedProduct.amount} ${selectedProduct.currency}`}
          </Button>
        </div>

        <div className="mt-4 text-xs text-zinc-500">
          <p>Country code mobile: 237</p>
          <p>Customer ID: {customerId || "N/A"}</p>
          <p>Payment Method ID: {paymentMethodId || "N/A"}</p>
        </div>

        {error ? (
          <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}
        {result ? (
          <p className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {result}
          </p>
        ) : null}
      </section>
    </div>
  )
}
