import type { SegmentNode } from "@reachdem/shared";

// ─── Segment Types ────────────────────────────────────────────────────────────

export interface CreateSegmentInput {
  organizationId: string;
  name: string;
  description?: string;
  definition: SegmentNode;
}

export interface UpdateSegmentInput {
  organizationId: string;
  segmentId: string;
  name?: string;
  description?: string;
  definition?: SegmentNode;
}

export interface GetSegmentsOptions {
  limit?: number;
  cursor?: string;
}
