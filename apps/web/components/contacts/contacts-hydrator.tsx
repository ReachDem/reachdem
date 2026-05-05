"use client";

import { useEffect, useRef } from "react";
import type { ContactRow } from "@/components/contacts/contact-data-table";
import { useContactsStore } from "@/lib/stores/contacts-store";

/**
 * Hydrates the Zustand contacts store with server-fetched data synchronously.
 * Renders nothing — purely a side-effect bridge between the server component
 * and the client store.
 */
export function ContactsHydrator({ contacts }: { contacts: ContactRow[] }) {
  const hydrated = useRef(false);
  const setContacts = useContactsStore((s) => s.setContacts);

  useEffect(() => {
    if (!hydrated.current) {
      setContacts(contacts);
      hydrated.current = true;
    }
  }, [contacts, setContacts]);

  return null;
}
