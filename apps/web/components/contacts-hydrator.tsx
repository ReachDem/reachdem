"use client";

import { useRef } from "react";
import type { ContactRow } from "@/components/contact-data-table";
import { useContactsStore } from "@/lib/stores/contacts-store";

/**
 * Hydrates the Zustand contacts store with server-fetched data synchronously.
 * Renders nothing — purely a side-effect bridge between the server component
 * and the client store.
 */
export function ContactsHydrator({ contacts }: { contacts: ContactRow[] }) {
  const hydrated = useRef(false);
  const setContacts = useContactsStore((s) => s.setContacts);

  if (!hydrated.current) {
    setContacts(contacts);
    hydrated.current = true;
  }

  return null;
}
