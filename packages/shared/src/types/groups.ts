// ─── Group Types ──────────────────────────────────────────────────────────────

export interface CreateGroupInput {
  name: string;
  description?: string | null;
}

export interface UpdateGroupInput {
  name?: string;
  description?: string | null;
}

export interface GetGroupsOptions {
  limit: number;
  cursor?: string | null;
}

// ─── Group Member Types ───────────────────────────────────────────────────────

export interface GetGroupContactsOptions {
  limit: number;
  cursor?: string | null;
}
