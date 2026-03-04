import { create } from "zustand";
import type { ContactRow } from "@/components/contact-data-table";

interface ContactsState {
  /** Full list of contacts for the active organisation */
  contacts: ContactRow[];
  isLoading: boolean;

  /** Hydrate from server-fetched data (e.g. in a server component) */
  setContacts: (contacts: ContactRow[]) => void;

  /** Optimistically add a single contact */
  addContact: (contact: ContactRow) => void;

  /** Optimistically remove contacts by ids */
  removeContacts: (ids: string[]) => void;
}

export const useContactsStore = create<ContactsState>((set) => ({
  contacts: [],
  isLoading: false,

  setContacts: (contacts) => set({ contacts, isLoading: false }),

  addContact: (contact) =>
    set((state) => ({ contacts: [contact, ...state.contacts] })),

  removeContacts: (ids) =>
    set((state) => ({
      contacts: state.contacts.filter((c) => !ids.includes(c.id)),
    })),
}));
