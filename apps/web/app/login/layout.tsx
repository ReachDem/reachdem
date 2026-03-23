import { redirect } from "next/navigation";

import { getAuthFlowState } from "@/lib/auth-flow";

export default async function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const flow = await getAuthFlowState();

  if (flow.hasSession) {
    redirect(flow.nextPath);
  }

  return <>{children}</>;
}
