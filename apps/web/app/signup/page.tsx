import { redirect } from "next/navigation";

import { getAuthFlowState } from "@/lib/server/auth-flow";

export default async function SignupPage() {
  const flow = await getAuthFlowState();

  if (flow.hasSession) {
    redirect("/continue-setup");
  }

  redirect("/register");
}
