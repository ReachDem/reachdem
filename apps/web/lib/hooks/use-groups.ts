import { useState, useEffect } from "react";

interface Group {
  id: string;
  name: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface GroupsResponse {
  data: Group[];
  nextCursor?: string;
}

export function useGroups() {
  const [data, setData] = useState<GroupsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchGroups() {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch("/api/v1/groups");

        if (!response.ok) {
          throw new Error(`Failed to fetch groups: ${response.statusText}`);
        }

        const result = await response.json();

        if (isMounted) {
          setData(result);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error("Unknown error"));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchGroups();

    return () => {
      isMounted = false;
    };
  }, []);

  return { data, isLoading, error };
}
