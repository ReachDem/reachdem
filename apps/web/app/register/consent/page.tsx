"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@reachdem/auth/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { completeRegistrationConsent } from "@/actions/onboarding";
import { AlertCircle } from "lucide-react";

export default function ConsentPage() {
  const router = useRouter();
  const { data: sessionData, isPending } = useSession();
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        Loading...
      </div>
    );
  }

  if (!sessionData?.user) {
    router.push("/login");
    return null;
  }

  const onSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      // Better-Auth provides `name`. Let's attempt to split it loosely to populate firstName / lastName
      const nameParts = (sessionData.user.name || "New User").split(" ");
      const firstName = nameParts[0];
      const lastName =
        nameParts.length > 1 ? nameParts.slice(1).join(" ") : "User";

      const result = await completeRegistrationConsent({
        firstName,
        lastName,
      });

      if (result.error) {
        setError(result.error);
        setIsSubmitting(false);
        return;
      }

      // Instead of forcing nextPath, we can just redirect to /continue-setup which acts as proxy
      router.push("/continue-setup");
    } catch (err) {
      setError("An error occurred during validation.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-muted/30 flex min-h-screen items-center justify-center">
      <div className="bg-background w-full max-w-md rounded-xl border p-8 shadow-lg">
        <div className="mb-6 flex items-center justify-center">
          <div className="bg-primary/10 text-primary flex size-16 items-center justify-center overflow-hidden rounded-full border text-xl font-bold">
            {sessionData.user.image ? (
              <img
                src={sessionData.user.image}
                alt={sessionData.user.name}
                className="size-full object-cover"
              />
            ) : (
              (sessionData.user.name || "G")[0].toUpperCase()
            )}
          </div>
        </div>

        <h1 className="mb-2 text-center text-xl font-bold">
          Welcome, {sessionData.user.name?.split(" ")[0]}
        </h1>
        <p className="text-muted-foreground mb-8 text-center text-sm">
          You are signed in with Google. Before continuing, please accept our
          terms of service.
        </p>

        <div className="bg-muted/40 mb-6 flex items-start space-x-3 rounded-lg border p-4">
          <Checkbox
            id="acceptTerms"
            checked={acceptTerms}
            onCheckedChange={(c) => setAcceptTerms(c as boolean)}
            className="mt-1"
          />
          <div className="grid gap-1.5 leading-none">
            <label
              htmlFor="acceptTerms"
              className="text-xs leading-relaxed font-medium"
            >
              I accept the{" "}
              <a
                href="https://reachdem.cc/terms"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary font-semibold hover:underline"
              >
                Terms of Service
              </a>{" "}
              and the{" "}
              <a
                href="https://reachdem.cc/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary font-semibold hover:underline"
              >
                Privacy Policy
              </a>
            </label>
            <p className="text-muted-foreground mt-1 text-xs">
              By continuing, you authorize ReachDem to configure your profile
              and process your data according to our policy.
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-destructive/10 text-destructive border-destructive/20 mb-6 flex items-center gap-2 rounded-md border p-3 text-sm font-medium">
            <AlertCircle className="size-4 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <Button
          className="w-full"
          disabled={!acceptTerms || isSubmitting}
          onClick={onSubmit}
        >
          {isSubmitting ? "Validating..." : "Continue"}
        </Button>
      </div>
    </div>
  );
}
