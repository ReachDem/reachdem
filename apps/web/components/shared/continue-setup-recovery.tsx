"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@reachdem/auth/client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type ContinueSetupRecoveryProps = {
  organizationId: string;
};

export function ContinueSetupRecovery({
  organizationId,
}: ContinueSetupRecoveryProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const restoreWorkspace = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { error: setActiveError } = await authClient.organization.setActive(
        {
          organizationId,
        }
      );

      if (setActiveError) {
        setError(
          setActiveError.message || "Failed to restore your active workspace."
        );
        setIsLoading(false);
        return;
      }

      router.replace("/");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to restore your active workspace."
      );
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void restoreWorkspace();
  }, [organizationId]);

  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Finishing your setup</CardTitle>
          <CardDescription>
            We are reconnecting your workspace before sending you into the app.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground text-sm">
            {isLoading
              ? "Restoring your active workspace..."
              : "Your workspace needs a quick retry before you can continue."}
          </p>
          {error && <p className="text-destructive text-sm">{error}</p>}
          {!isLoading && (
            <Button onClick={restoreWorkspace} className="w-full">
              Retry
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
