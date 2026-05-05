import { useState, useEffect, useRef } from "react";

interface Contact {
  id: string;
  name: string;
  email?: string | null;
  phoneE164?: string | null;
}

interface ContactSearchResult {
  data: Contact[];
  meta: { total: number; page: number; limit: number };
}

export function useContactSearch(query: string, debounceMs = 300) {
  const [results, setResults] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!query || query.length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsLoading(true);
      try {
        const res = await fetch(
          `/api/v1/contacts?q=${encodeURIComponent(query)}&limit=10`,
          { signal: controller.signal }
        );
        if (!res.ok) throw new Error("Failed to search contacts");
        const json: ContactSearchResult = await res.json();
        if (!controller.signal.aborted) {
          setResults(json.data);
        }
      } catch (err) {
        if (err instanceof Error && err.name !== "AbortError") {
          setResults([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }, debounceMs);

    return () => {
      clearTimeout(timer);
    };
  }, [query, debounceMs]);

  return { results, isLoading };
}
