import { useState, useEffect } from "react";

interface Segment {
  id: string;
  name: string;
  description?: string;
  definition?: any;
  createdAt?: string;
  updatedAt?: string;
}

interface SegmentsResponse {
  data: Segment[];
  nextCursor?: string;
}

export function useSegments() {
  const [data, setData] = useState<SegmentsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchSegments() {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch("/api/v1/segments");

        if (!response.ok) {
          throw new Error(`Failed to fetch segments: ${response.statusText}`);
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

    fetchSegments();

    return () => {
      isMounted = false;
    };
  }, []);

  return { data, isLoading, error };
}
