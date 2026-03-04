import { create } from "zustand";
import {
  type Contact,
  listGroupContacts,
  listContacts,
} from "@/lib/api/groups";

interface GroupDetailState {
  /** Members of the currently-viewed group */
  members: Contact[];
  /** Total member count */
  memberCount: number;
  /** All workspace contacts (for the picker) */
  allContacts: Contact[];
  /** Whether the "Add contacts" modal is open */
  isAddModalOpen: boolean;

  /** Whether members are currently loading from the API */
  isLoadingMembers: boolean;
  /** Whether all contacts are currently loading from the API */
  isLoadingContacts: boolean;

  // ── Actions ──────────────────────────────────────────────────────────────
  /** Hydrate members from initial server data */
  setMembers: (members: Contact[], count: number) => void;
  /** Hydrate all contacts from initial server data */
  setAllContacts: (contacts: Contact[]) => void;
  /** Toggle the add-contacts modal */
  setIsAddModalOpen: (open: boolean) => void;
  /** Re-fetch members from the API */
  refreshMembers: (groupId: string) => Promise<void>;
  /** Re-fetch all contacts for the picker */
  refreshContacts: () => Promise<void>;
  /** Optimistically remove members */
  removeMembers: (ids: string[]) => void;
}

export const useGroupDetailStore = create<GroupDetailState>((set) => ({
  members: [],
  memberCount: 0,
  allContacts: [],
  isAddModalOpen: false,
  isLoadingMembers: false,
  isLoadingContacts: false,

  setMembers: (members, count) =>
    set({ members, memberCount: count, isLoadingMembers: false }),

  setAllContacts: (contacts) =>
    set({ allContacts: contacts, isLoadingContacts: false }),

  setIsAddModalOpen: (open) => set({ isAddModalOpen: open }),

  refreshMembers: async (groupId) => {
    set({ isLoadingMembers: true });
    try {
      const res = await listGroupContacts(groupId, { limit: 200 });
      set({
        members: res.items,
        memberCount: res.meta.total,
        isLoadingMembers: false,
      });
    } catch {
      set({ isLoadingMembers: false });
      // Silently fail — caller can retry
    }
  },

  refreshContacts: async () => {
    set({ isLoadingContacts: true });
    try {
      const res = await listContacts({ limit: 200 });
      set({ allContacts: res.items, isLoadingContacts: false });
    } catch {
      set({ isLoadingContacts: false });
      // Silently fail
    }
  },

  removeMembers: (ids) =>
    set((state) => {
      const idSet = new Set(ids);
      const next = state.members.filter((m) => !idSet.has(m.id));
      return { members: next, memberCount: next.length };
    }),
}));
