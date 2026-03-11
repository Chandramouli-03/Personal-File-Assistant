import { useState, useCallback } from 'react';
import { searchFiles, searchLocalFiles } from '../services/api';
import { formatSize, timeAgo, getFileExtension } from '../utils/format';

/**
 * Custom hook for file search functionality
 * @returns {Object} Search state and methods
 */
export function useSearch() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastQuery, setLastQuery] = useState('');
  const [aiInterpretation, setAiInterpretation] = useState(null);

  /**
   * Map backend search result to frontend format
   */
  const mapResult = useCallback((result, index) => {
    const { file_info, device_name, device_id, relevance_score, match_reason } = result;

    // Extract extension for type determination
    const extension = getFileExtension(file_info.name);

    // Map file type to frontend type
    const typeMap = {
      document: extension || 'doc',
      image: 'image',
      video: 'video',
      audio: 'audio',
      archive: 'archive',
      code: 'code',
      data: 'data',
      other: extension || 'file',
    };

    return {
      id: index + 1,
      name: file_info.name,
      type: typeMap[file_info.file_type] || extension || 'file',
      device: device_name,
      deviceId: device_id,
      location: file_info.relative_path || file_info.path,
      path: file_info.path,
      size: formatSize(file_info.size),
      sizeBytes: file_info.size,
      modifiedTime: file_info.modified_time,
      modified: timeAgo(file_info.modified_time),
      relevanceScore: relevance_score,
      matchReason: match_reason,
      preview: file_info.preview_text,
    };
  }, []);

  /**
   * Execute search across all devices
   */
  const search = useCallback(async (query, options = {}) => {
    if (!query || !query.trim()) {
      setResults([]);
      return [];
    }

    setLoading(true);
    setError(null);
    setLastQuery(query);
    setAiInterpretation(null);

    try {
      const response = await searchFiles(query, {
        fileTypes: options.fileTypes,
        devices: options.devices,
        maxResults: options.maxResults || 50,
      });

      const mappedResults = (response.results || []).map(mapResult);
      setResults(mappedResults);
      setAiInterpretation(response.ai_interpretation);

      return mappedResults;
    } catch (err) {
      console.error('Search failed:', err);
      setError(err.message);
      setResults([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, [mapResult]);

  /**
   * Search only local device
   */
  const searchLocal = useCallback(async (query, options = {}) => {
    if (!query || !query.trim()) {
      setResults([]);
      return [];
    }

    setLoading(true);
    setError(null);
    setLastQuery(query);

    try {
      const response = await searchLocalFiles(query, {
        fileTypes: options.fileTypes,
        maxResults: options.maxResults || 50,
      });

      const mappedResults = (response.results || []).map(mapResult);
      setResults(mappedResults);

      return mappedResults;
    } catch (err) {
      console.error('Local search failed:', err);
      setError(err.message);
      setResults([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, [mapResult]);

  /**
   * Clear search results
   */
  const clear = useCallback(() => {
    setResults([]);
    setError(null);
    setLastQuery('');
    setAiInterpretation(null);
  }, []);

  /**
   * Filter current results by type
   */
  const filterByType = useCallback((type) => {
    if (!type || type === 'all') {
      return results;
    }

    const typeFilters = {
      recent: (r) => {
        // Files modified in last 24 hours
        const modified = new Date(r.modifiedTime);
        const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        return modified > dayAgo;
      },
      images: (r) => ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'].includes(r.type.toLowerCase()),
      documents: (r) => ['pdf', 'doc', 'docx', 'txt', 'md', 'xls', 'xlsx', 'ppt', 'pptx'].includes(r.type.toLowerCase()),
      videos: (r) => ['mp4', 'avi', 'mkv', 'mov', 'wmv', 'webm'].includes(r.type.toLowerCase()),
    };

    const filter = typeFilters[type];
    return filter ? results.filter(filter) : results;
  }, [results]);

  return {
    results,
    loading,
    error,
    lastQuery,
    aiInterpretation,
    search,
    searchLocal,
    clear,
    filterByType,
  };
}

export default useSearch;
