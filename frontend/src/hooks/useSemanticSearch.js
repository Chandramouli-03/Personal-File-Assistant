import { useState, useCallback } from 'react';
import { semanticSearch } from '../services/api';

/**
 * Custom hook for semantic search functionality
 * @returns {Object} Search state and methods
 */
export function useSemanticSearch() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Execute semantic search
   */
  const search = useCallback(async (query, options = {}) => {
    if (!query || !query.trim()) {
      setResults([]);
      return [];
    }

    setLoading(true);
    setError(null);

    try {
      const response = await semanticSearch(query, options);
      setResults(response);
      return response;
    } catch (err) {
      console.error('Semantic search failed:', err);
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Clear search results
   */
  const clear = useCallback(() => {
    setResults([]);
    setError(null);
  }, []);

  return {
    results,
    loading,
    error,
    search,
    clear,
  };
}
