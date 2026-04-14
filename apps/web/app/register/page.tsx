import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/register-form";
import { getAuthFlowState } from "@/lib/auth-flow";

export default async function RegisterPage() {
  const flow = await getAuthFlowState();

  if (flow.hasSession) {
    redirect(flow.nextPath);
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* Left side: Form */}
      <div className="bg-background flex w-full flex-col justify-center px-4 py-12 sm:px-6 md:w-1/2 lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          <RegisterForm />
        </div>
      </div>

      {/* Right side: Visual Splash */}
      <div className="bg-muted relative hidden w-1/2 items-center justify-center p-12 md:flex">
        <div className="from-primary/20 via-background to-primary/5 absolute inset-0 bg-gradient-to-br" />
        <div className="relative z-10 flex max-w-lg flex-col items-center space-y-8 text-center">
          <div className="space-y-4">
            <h2 className="text-3xl font-bold tracking-tight">
              Outils professionnels pour votre croissance
            </h2>
            <p className="text-muted-foreground text-lg">
              Une plateforme unifiée qui regroupe la gestion de vos contacts,
              vos campagnes et vos données d'acquisition.
            </p>
          </div>
          <div className="grid w-full grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="bg-background/50 flex flex-col items-center justify-center space-y-2 rounded-xl border p-6 backdrop-blur-sm"
              >
                <div className="bg-primary/10 size-10 rounded-full" />
                <div className="bg-muted-foreground/20 h-2 w-16 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
