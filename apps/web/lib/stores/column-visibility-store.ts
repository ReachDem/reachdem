import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { VisibilityState } from "@tanstack/react-table";

/**
 * Persists column visibility per table key to localStorage.
 * Keys: "contacts", "group-members", "group-detail", etc.
 */

interface ColumnVisibilityState {
  /** Map of tableKey → VisibilityState */
  tables: Record<string, VisibilityState>;
  /** Get visibility for a specific table (returns undefined if not yet saved) */
  getVisibility: (tableKey: string) => VisibilityState | undefined;
  /** Save visibility for a specific table */
  setVisibility: (tableKey: string, visibility: VisibilityState) => void;
}

export const useColumnVisibilityStore = create<ColumnVisibilityState>()(
  persist(
    (set, get) => ({
      tables: {},

      getVisibility: (tableKey) => get().tables[tableKey],

      setVisibility: (tableKey, visibility) =>
        set((state) => ({
          tables: { ...state.tables, [tableKey]: visibility },
        })),
    }),
    {
      name: "reachdem-column-visibility",
    }
  )
);
