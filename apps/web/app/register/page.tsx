import { OnboardingWizard } from "@/components/onboarding-wizard";
import { Shader6 } from "@/components/shader6";

export default function RegisterPage() {
  return (
    <div className="min-h-screen overflow-hidden">
      <div className="absolute inset-0 z-0 opacity-10 shadow-md dark:opacity-20">
        <Shader6 />
      </div>
      <div className="relative z-10">
        <OnboardingWizard mode="email-signup" />
      </div>
    </div>
  );
}
