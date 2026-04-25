import { ReactNode } from "react";

export const dynamic = "force-dynamic";

export default function VerifyEmailLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <>{children}</>;
}
