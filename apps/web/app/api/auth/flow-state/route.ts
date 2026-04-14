import { NextResponse } from "next/server";

import { getAuthFlowState } from "@/lib/auth-flow";

export async function GET() {
  const flow = await getAuthFlowState();

  return NextResponse.json({
    hasSession: flow.hasSession,
    isReady: flow.isReady,
    nextStep: flow.nextStep,
    nextPath: flow.nextPath,
    onboardingState: flow.onboardingState,
  });
}
