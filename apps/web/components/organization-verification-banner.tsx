import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

type OrganizationVerificationBannerProps = {
  senderId: string;
  verificationStatus: "not_submitted" | "pending" | "verified" | "rejected";
};

export function OrganizationVerificationBanner({
  senderId: _senderId,
  verificationStatus,
}: OrganizationVerificationBannerProps) {
  if (verificationStatus === "verified") {
    return null;
  }

  return (
    <div className="border-b border-black/10 bg-[#ff751f] text-white xl:-mt-2">
      <div className="mx-auto flex w-full max-w-screen-xl flex-wrap items-center justify-center px-4 py-1 text-center lg:px-6">
        <p className="text-sm font-medium text-white">
          You are currently in preview mode. All SMS sent will use a default
          sender ID.
        </p>

        <Button
          variant="link"
          asChild
          className="-ml-2 text-white underline hover:text-white/80"
        >
          <Link href="/settings/workspace">
            Verify your organization
            <ArrowRight className="-ml-1 size-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
