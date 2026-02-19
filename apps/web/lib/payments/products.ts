export type ProductBillingType = "fixed" | "recurring";

export type CheckoutProduct = {
  id: ProductBillingType;
  label: string;
  description: string;
  amount: number;
  currency: "XAF";
  frequencyLabel: string;
};

export const checkoutProducts: Record<ProductBillingType, CheckoutProduct> = {
  fixed: {
    id: "fixed",
    label: "Produit fixe",
    description: "Paiement unique de test.",
    amount: 100,
    currency: "XAF",
    frequencyLabel: "Unique",
  },
  recurring: {
    id: "recurring",
    label: "Produit recurrent",
    description: "Produit abonnement (simulation checkout recurrent).",
    amount: 200,
    currency: "XAF",
    frequencyLabel: "Mensuel",
  },
};

export const getCheckoutProduct = (productType: string): CheckoutProduct | null => {
  if (productType === "fixed" || productType === "recurring") {
    return checkoutProducts[productType];
  }

  return null;
};
