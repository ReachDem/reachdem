import { redirect } from "next/navigation";

import { getAuthFlowState } from "@/lib/server/auth-flow";

export default async function Home() {
  const flow = await getAuthFlowState();

  redirect(flow.nextPath);
}
