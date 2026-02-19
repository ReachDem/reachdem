import { NextResponse } from "next/server";
import { createFlutterwaveCheckoutSession } from "@/lib/flutterwave";
import { getCheckoutProduct } from "@/lib/payments/products";

type CheckoutRequestBody = {
  productType?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CheckoutRequestBody;
    console.log("[API /payments/checkout] Incoming request", {
      productType: body.productType,
    });
    const product = getCheckoutProduct(body.productType || "");

    if (!product) {
      return NextResponse.json(
        { error: "Invalid product type." },
        { status: 400 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    console.log("[API /payments/checkout] FLW config snapshot", {
      hasClientId: Boolean(
        process.env.FLUTTERWAVE_V4_CLIENT_ID || process.env.FLW_V4_CLIENT_ID
      ),
      hasClientSecret: Boolean(
        process.env.FLUTTERWAVE_V4_CLIENT_SECRET || process.env.FLW_V4_CLIENT_SECRET
      ),
      baseUrl:
        process.env.FLUTTERWAVE_V4_BASE_URL ||
        process.env.FLW_V4_BASE_URL ||
        "https://f4bexperience.flutterwave.com",
      appUrl,
    });
    const txRef = `rd-${product.id}-${Date.now().toString(36)}-${crypto
      .randomUUID()
      .replace(/-/g, "")
      .slice(0, 8)}`.slice(0, 40);
    console.log("[API /payments/checkout] Creating checkout", {
      txRef,
      amount: product.amount,
      currency: product.currency,
      productType: product.id,
    });

    const session = await createFlutterwaveCheckoutSession({
      tx_ref: txRef,
      productType: product.id,
      amount: product.amount,
      currency: product.currency,
      redirect_url: `${appUrl}/payments/callback?productType=${product.id}`,
    });

    return NextResponse.json({
      checkoutUrl: session.checkoutUrl,
      sessionId: session.sessionId,
      txRef,
      product,
      publicKey:
        process.env.NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY ||
        process.env.NEXT_PUBLIC_FLW_PUBLIC_KEY ||
        process.env.FLUTTERWAVE_PUB_KEY_V3 ||
        null,
      checkoutConfig: {
        tx_ref: txRef,
        amount: product.amount,
        currency: product.currency,
        redirect_url: `${appUrl}/payments/callback?productType=${product.id}`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Payment error.";
    console.error("[API /payments/checkout] Failed", {
      error: message,
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
