import { create } from "zustand";
import {
  type Group,
  listGroups,
  createGroup as apiCreateGroup,
  deleteGroup as apiDeleteGroup,
} from "@/lib/api/groups";

interface GroupsState {
  /** All groups for the active organisation */
  groups: Group[];
  /** Currently-selected group id (right panel) */
  selectedGroupId: string | null;
  /** Filter text */
  search: string;
  isLoading: boolean;

  // ── Actions ──────────────────────────────────────────────────────────────
  /** Hydrate from server-fetched data */
  setGroups: (groups: Group[]) => void;
  /** Refresh from the API (client-side) */
  refreshGroups: () => Promise<void>;
  /** Select a group for the right panel */
  selectGroup: (id: string | null) => void;
  /** Update the search filter */
  setSearch: (search: string) => void;
  /** Add a group optimistically after creation */
  addGroup: (group: Group) => void;
  /** Remove a group optimistically after deletion */
  removeGroup: (id: string) => void;
  /** Update a group optimistically after edit */
  updateGroup: (group: Group) => void;
}

export const useGroupsStore = create<GroupsState>((set, get) => ({
  groups: [],
  selectedGroupId: null,
  search: "",
  isLoading: false,

  setGroups: (groups) => set({ groups, isLoading: false }),

  refreshGroups: async () => {
    set({ isLoading: true });
    try {
      const res = await listGroups({ limit: 100 });
      set({ groups: res.items ?? [], isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  selectGroup: (id) => set({ selectedGroupId: id }),

  setSearch: (search) => set({ search }),

  addGroup: (group) =>
    set((state) => ({
      groups: [group, ...state.groups],
      selectedGroupId: group.id,
    })),

  removeGroup: (id) =>
    set((state) => ({
      groups: state.groups.filter((g) => g.id !== id),
      selectedGroupId:
        state.selectedGroupId === id ? null : state.selectedGroupId,
    })),

  updateGroup: (group) =>
    set((state) => ({
      groups: state.groups.map((g) => (g.id === group.id ? group : g)),
    })),
}));
