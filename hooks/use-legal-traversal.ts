"use client";

import { useState, useCallback } from "react";
import type { TraversalResult } from "@/lib/types/traversal";

interface UseTraversalOptions {
  maxDepth?: number;
  onSuccess?: (result: TraversalResult) => void;
  onError?: (error: string) => void;
}

export function useLegalTraversal(options: UseTraversalOptions = {}) {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<TraversalResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const traverseDocument = useCallback(async (caseInformation: any) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/traverse", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          caseInformation,
          maxDepth: options.maxDepth || 8,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to traverse document");
      }

      setResult(data.result);
      options.onSuccess?.(data.result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An error occurred";
      setError(errorMessage);
      options.onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [options]);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return {
    traverseDocument,
    isLoading,
    result,
    error,
    reset,
  };
} 