import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/register-form";
import { getAuthFlowState } from "@/lib/auth-flow";
import { VisualSplashBackground } from "@/components/visual-splash-background";

export default async function RegisterPage() {
  const flow = await getAuthFlowState();

  if (flow.hasSession) {
    redirect(flow.nextPath);
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* Left side: Form */}
      <div className="bg-background flex w-full flex-col justify-center px-4 sm:px-6 md:w-1/2 lg:px-20">
        <div className="flex justify-center gap-2 md:justify-start"></div>
        <div className="mx-auto w-full max-w-sm lg:w-96">
          <RegisterForm />
        </div>
      </div>

      {/* Right side: Visual Splash */}
      <VisualSplashBackground />
    </div>
  );
}
