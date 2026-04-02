import { OnboardingWizard } from "@/components/onboarding-wizard";
import { Shader8 } from "@/components/shader8";

export default function RegisterPage() {
  return (
    <div className="min-h-screen overflow-hidden">
      <div className="absolute inset-0 z-0 opacity-50 shadow-md">
        <Shader8 />
      </div>
      <div className="relative z-10">
        <OnboardingWizard mode="email-signup" />
      </div>
    </div>
  );
}
