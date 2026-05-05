import { redirect } from "next/navigation";

import { getAuthFlowState } from "@/lib/server/auth-flow";

export default async function RegisterLayout({
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
