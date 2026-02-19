import { NextResponse } from "next/server";
import {
  createFlutterwaveCustomer,
  createFlutterwaveMobilePaymentMethod,
} from "@/lib/flutterwave";
import { getCheckoutProduct } from "@/lib/payments/products";

type InitRequestBody = {
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
  network?: string;
  countryCode?: string;
  productType?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as InitRequestBody;
    console.log("[API /payments/mobile/init] Incoming request", {
      email: body.email,
      phoneNumber: body.phoneNumber,
      network: body.network,
      productType: body.productType,
    });

    const firstName = (body.firstName || "").trim();
    const lastName = (body.lastName || "").trim();
    const email = (body.email || "").trim();
    const phoneNumber = (body.phoneNumber || "").trim();
    const network = ((body.network || "").trim().toLowerCase() as "mtn" | "orange");
    const countryCode = (body.countryCode || "237").trim();
    const product = getCheckoutProduct(body.productType || "");

    if (!firstName || !lastName || !email || !phoneNumber || !network || !product) {
      return NextResponse.json(
        { error: "Missing required fields (customer or product)." },
        { status: 400 }
      );
    }

    if (network !== "mtn" && network !== "orange") {
      return NextResponse.json(
        { error: "Network must be mtn or orange." },
        { status: 400 }
      );
    }

    const { customerId } = await createFlutterwaveCustomer({
      first_name: firstName,
      last_name: lastName,
      email,
      phone_number: phoneNumber,
    });

    const { paymentMethodId } = await createFlutterwaveMobilePaymentMethod({
      customer_id: customerId,
      phone_number: phoneNumber,
      network,
      country_code: countryCode,
    });

    return NextResponse.json({
      customerId,
      paymentMethodId,
      product,
      network,
      countryCode,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Mobile init error.";
    console.error("[API /payments/mobile/init] Failed", { error: message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
