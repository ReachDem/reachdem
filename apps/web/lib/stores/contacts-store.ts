import { create } from "zustand";
import type { ContactRow } from "@/components/contacts/contact-data-table";
import { getContacts } from "@/app/actions/contacts";

interface ContactsState {
  /** Full list of contacts for the active organisation */
  contacts: ContactRow[];
  isLoading: boolean;
  hasHydrated: boolean;

  /** Hydrate from server-fetched data (e.g. in a server component) */
  setContacts: (contacts: ContactRow[]) => void;

  /** Optimistically add a single contact */
  addContact: (contact: ContactRow) => void;

  /** Optimistically update a single contact */
  updateContact: (id: string, updates: Partial<ContactRow>) => void;

  /** Optimistically remove contacts by ids */
  removeContacts: (ids: string[]) => void;

  /** Refresh contacts from server */
  refreshContacts: () => Promise<void>;
}

export const useContactsStore = create<ContactsState>((set) => ({
  contacts: [],
  isLoading: false,
  hasHydrated: false,

  setContacts: (contacts) =>
    set({ contacts, isLoading: false, hasHydrated: true }),

  addContact: (contact) =>
    set((state) => ({
      contacts: [contact, ...state.contacts],
      hasHydrated: true,
    })),

  updateContact: (id, updates) =>
    set((state) => ({
      contacts: state.contacts.map((c) =>
        c.id === id ? { ...c, ...updates } : c
      ),
      hasHydrated: true,
    })),

  removeContacts: (ids) =>
    set((state) => ({
      contacts: state.contacts.filter((c) => !ids.includes(c.id)),
      hasHydrated: true,
    })),

  refreshContacts: async () => {
    set({ isLoading: true });
    try {
      const contacts = await getContacts();
      set({
        contacts: contacts as ContactRow[],
        isLoading: false,
        hasHydrated: true,
      });
    } catch (error) {
      console.error("Failed to refresh contacts:", error);
      set({ isLoading: false });
    }
  },
}));
