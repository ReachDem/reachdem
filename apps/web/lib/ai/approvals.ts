import type { PendingApproval } from "./types";

function approvalId() {
  return `approval_${crypto.randomUUID()}`;
}

export function detectPendingApprovals(input: {
  message: string;
  requestedAction?: {
    capability: string;
    summary: string;
    targetLabel?: string;
    input?: unknown;
  };
}): PendingApproval[] {
  if (input.requestedAction) {
    return [
      {
        id: approvalId(),
        capability: input.requestedAction.capability,
        summary: input.requestedAction.summary,
        targetLabel: input.requestedAction.targetLabel,
        input: input.requestedAction.input,
        riskLevel: "medium",
      },
    ];
  }

  const message = input.message.toLowerCase();

  if (
    /(send|envoyer|envoie|launch|lancer|create campaign|crée une campagne|update template|modifier le template|edit template)/i.test(
      message
    )
  ) {
    return [
      {
        id: approvalId(),
        capability: "writeAction",
        summary:
          "This request looks like a write action and should be reviewed before execution.",
        riskLevel: "medium",
      },
    ];
  }

  return [];
}
