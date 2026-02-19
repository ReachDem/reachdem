import { NextResponse } from "next/server";
import { createFlutterwaveCharge } from "@/lib/flutterwave";
import { getCheckoutProduct } from "@/lib/payments/products";

type ChargeRequestBody = {
  customerId?: string;
  paymentMethodId?: string;
  productType?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ChargeRequestBody;
    console.log("[API /payments/mobile/charge] Incoming request", {
      customerId: body.customerId,
      paymentMethodId: body.paymentMethodId,
      productType: body.productType,
    });

    const customerId = (body.customerId || "").trim();
    const paymentMethodId = (body.paymentMethodId || "").trim();
    const product = getCheckoutProduct(body.productType || "");
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    if (!customerId || !paymentMethodId || !product) {
      return NextResponse.json(
        { error: "Missing customer/payment method/product." },
        { status: 400 }
      );
    }

    const reference = `rd-mob-${product.id}-${Date.now().toString(36)}-${crypto
      .randomUUID()
      .replace(/-/g, "")
      .slice(0, 8)}`.slice(0, 50);

    const charge = await createFlutterwaveCharge({
      customer_id: customerId,
      payment_method_id: paymentMethodId,
      amount: product.amount,
      currency: product.currency,
      tx_ref: reference,
      reference,
      redirect_url: `${appUrl}/payments/callback?productType=${product.id}`,
    });

    return NextResponse.json({
      reference,
      product,
      charge,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Mobile charge error.";
    console.error("[API /payments/mobile/charge] Failed", { error: message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
