import { LoginForm } from "@/components/login-form";
import { Shader6 } from "@/components/shader6";
import Image from "next/image";

export default function LoginPage() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 z-0 opacity-50 dark:opacity-100">
        <Shader6 />
      </div>
      <div className="relative z-10 flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
        <div className="flex w-full max-w-sm flex-col gap-6">
          <a
            href="/"
            className="flex items-center gap-2 self-center font-medium"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-black">
              <Image
                src="/dark-logo.png"
                alt="ReachDem Logo"
                width={32}
                height={32}
                className="rounded-sm"
              />
            </div>
          </a>
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
