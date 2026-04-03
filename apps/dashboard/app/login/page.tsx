"use client";

import { useActionState } from "react";
import { loginAction } from "@/lib/founder-admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ShieldCheck, AlertCircle, Loader2 } from "lucide-react";

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(loginAction, null);

  return (
    <div className="bg-background flex min-h-screen items-center justify-center p-4">
      {/* Subtle grid background */}
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:32px_32px]" />

      <div className="relative z-10 w-full max-w-sm">
        <Card className="border-border/50 shadow-2xl">
          <CardHeader className="space-y-4 pb-6">
            <div className="flex justify-center">
              <div className="bg-primary/10 ring-primary/20 flex h-14 w-14 items-center justify-center rounded-2xl ring-1">
                <ShieldCheck className="text-primary h-7 w-7" />
              </div>
            </div>
            <div className="text-center">
              <CardTitle className="text-xl font-semibold">
                ReachDem Admin
              </CardTitle>
              <CardDescription className="mt-1 text-sm">
                Restricted access — founders only
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent>
            <form action={formAction} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm font-medium">
                  Email
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@reachdem.com"
                  autoComplete="email"
                  required
                  disabled={isPending}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-sm font-medium">
                  Password
                </Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  disabled={isPending}
                />
              </div>

              {state?.error && (
                <Alert variant="destructive" className="py-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    {state.error}
                  </AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Authenticating…
                  </>
                ) : (
                  "Sign in"
                )}
              </Button>
            </form>

            <p className="text-muted-foreground mt-4 text-center text-sm">
              This interface is private and not publicly accessible.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
