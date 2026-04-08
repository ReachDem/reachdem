import { requireOrgMembership } from "@reachdem/auth";
import { PaymentCheckoutFlow } from "@/components/payments/PaymentCheckoutFlow";

export default async function CheckoutPage() {
  const { user, session } = await requireOrgMembership();
  const organizationId = session.activeOrganizationId;

  if (!organizationId) {
    return <div>No active organization found.</div>;
  }

  // Spliter le nom utilisateur s'il s'agit d'une simple chaine (selon Better Auth)
  const nameParts = user.name?.split(" ") || [];
  const firstName = nameParts[0] || "User";
  const lastName = nameParts.slice(1).join(" ") || "Reachdem";

  return (
    <div className="flex h-full w-full flex-col">
      <PaymentCheckoutFlow
        amountMinor={5000} // C'est un exemple, dynamisons via backend (ex: amount minimum de top up si le flow standard demande explicitement l'argent)
        currency="XAF"
        organizationId={organizationId}
        customerEmail={user.email}
        customerName={{ first: firstName, last: lastName }}
      />
    </div>
  );
}
