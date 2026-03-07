import { create } from "zustand";
import { type Segment, listSegments } from "@/lib/api/segments";

interface SegmentsState {
  /** All segments for the active organisation */
  segments: Segment[];
  /** Currently-selected segment id (right panel preview) */
  selectedSegmentId: string | null;
  /** Filter text */
  search: string;
  isLoading: boolean;

  // ── Actions ──────────────────────────────────────────────────────────────
  /** Hydrate from server-fetched data */
  setSegments: (segments: Segment[]) => void;
  /** Refresh from the API (client-side) */
  refreshSegments: () => Promise<void>;
  /** Select a segment for the right panel preview */
  selectSegment: (id: string | null) => void;
  /** Update the search filter */
  setSearch: (search: string) => void;
  /** Add a segment optimistically after creation */
  addSegment: (segment: Segment) => void;
  /** Remove a segment optimistically after deletion */
  removeSegment: (id: string) => void;
}

export const useSegmentsStore = create<SegmentsState>((set) => ({
  segments: [],
  selectedSegmentId: null,
  search: "",
  isLoading: false,

  setSegments: (segments) => set({ segments, isLoading: false }),

  refreshSegments: async () => {
    set({ isLoading: true });
    try {
      const res = await listSegments({ limit: 100 });
      set({ segments: res.items ?? [], isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  selectSegment: (id) => set({ selectedSegmentId: id }),

  setSearch: (search) => set({ search }),

  addSegment: (segment) =>
    set((state) => ({
      segments: [segment, ...state.segments],
      selectedSegmentId: segment.id,
    })),

  removeSegment: (id) =>
    set((state) => ({
      segments: state.segments.filter((s) => s.id !== id),
      selectedSegmentId:
        state.selectedSegmentId === id ? null : state.selectedSegmentId,
    })),
}));
