import { redirect } from "next/navigation";
import { getAuthFlowState } from "@/lib/server/auth-flow";
import { SetupWizardShell } from "@/components/setup-wizard-shell";

export default async function SetupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const flow = await getAuthFlowState();

  if (!flow.hasSession) {
    redirect("/login");
  }

  if (flow.isReady) {
    redirect("/dashboard");
  }

  // We do not redirect to exact step in layout so pages can render, but if email is not verified, force verify_email
  if (!flow.isEmailVerified) {
    redirect("/verify-email");
  }

  return <SetupWizardShell>{children}</SetupWizardShell>;
}
