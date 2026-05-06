"use client";

import { useState, useRef, useEffect } from "react";
import { X } from "lucide-react";
import { useContactSearch } from "@/hooks/use-contact-search";
import { cn } from "@/lib/utils";

export interface PickedContact {
  id: string;
  name: string;
  email?: string | null;
  phoneE164?: string | null;
}

interface ContactPickerProps {
  selectedContacts: PickedContact[];
  onContactsChange: (contacts: PickedContact[]) => void;
  disabled?: boolean;
}

export function ContactPicker({
  selectedContacts,
  onContactsChange,
  disabled = false,
}: ContactPickerProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const { results, isLoading } = useContactSearch(query);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredResults = results.filter(
    (c) => !selectedContacts.some((s) => s.id === c.id)
  );

  function addContact(contact: PickedContact) {
    onContactsChange([...selectedContacts, contact]);
    setQuery("");
    setIsOpen(false);
    inputRef.current?.focus();
  }

  function removeContact(id: string) {
    onContactsChange(selectedContacts.filter((c) => c.id !== id));
  }

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div
        className={cn(
          "flex min-h-[44px] flex-wrap items-center gap-1.5 rounded-lg border px-3 py-2",
          disabled && "pointer-events-none opacity-50"
        )}
        onClick={() => inputRef.current?.focus()}
      >
        {selectedContacts.map((contact) => (
          <span
            key={contact.id}
            className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs text-blue-700"
          >
            {contact.name}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeContact(contact.id);
              }}
              className="hover:text-blue-900"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => query.length >= 2 && setIsOpen(true)}
          placeholder={
            selectedContacts.length === 0
              ? "Search for a contact..."
              : "Add more..."
          }
          disabled={disabled}
          className="placeholder:text-muted-foreground min-w-[120px] flex-1 border-none bg-transparent text-sm outline-none"
        />
      </div>

      {isOpen && (query.length >= 2 || filteredResults.length > 0) && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border bg-white shadow-lg">
          {isLoading && (
            <div className="text-muted-foreground px-3 py-2 text-xs">
              Searching...
            </div>
          )}
          {!isLoading && filteredResults.length === 0 && query.length >= 2 && (
            <div className="text-muted-foreground px-3 py-2 text-xs">
              No contacts found
            </div>
          )}
          {filteredResults.map((contact) => (
            <button
              key={contact.id}
              type="button"
              className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-slate-50"
              onClick={() => addContact(contact)}
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-semibold text-slate-500">
                {contact.name
                  .split(" ")
                  .map((w) => w[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">
                  {contact.name}
                </div>
                <div className="text-muted-foreground truncate text-xs">
                  {contact.email || contact.phoneE164 || ""}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {selectedContacts.length > 0 && (
        <div className="text-muted-foreground mt-1.5 text-xs">
          {selectedContacts.length} contact
          {selectedContacts.length > 1 ? "s" : ""} selected
        </div>
      )}
    </div>
  );
}
