import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import SearchResultsHeader from '../components/search-results/SearchResultsHeader';
import SearchFilter from '../components/search-results/SearchFilter';
import SearchResultItem from '../components/search-results/SearchResultItem';
import { useSearch } from '../hooks/useSearch';

export default function SearchResults() {
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const [searchTerm, setSearchTerm] = useState(initialQuery);
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedItems, setSelectedItems] = useState(new Set());

  // Use the search hook
  const { results, loading, error, lastQuery, aiInterpretation, search, clear } = useSearch();

  // Perform search when query changes
  useEffect(() => {
    if (initialQuery && initialQuery !== lastQuery) {
      search(initialQuery);
    }
  }, [initialQuery, lastQuery, search]);

  // Handle search submission
  const handleSearch = (query) => {
    if (query.trim()) {
      search(query);
      setSelectedItems(new Set());
    }
  };

  // Filter results based on active filter
  const filteredResults = useMemo(() => {
    if (activeFilter === 'all') {
      return results;
    }

    return results.filter((result) => {
      switch (activeFilter) {
        case 'images':
          return ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp', 'heic'].includes(
            result.type.toLowerCase()
          );
        case 'documents':
          return ['pdf', 'doc', 'docx', 'txt', 'md', 'xls', 'xlsx', 'ppt', 'pptx'].includes(
            result.type.toLowerCase()
          );
        case 'videos':
          return ['mp4', 'avi', 'mkv', 'mov', 'wmv', 'webm', 'm4v'].includes(
            result.type.toLowerCase()
          );
        case 'recent':
          // Files modified in last 24 hours
          if (result.modifiedTime) {
            const modified = new Date(result.modifiedTime);
            const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
            return modified > dayAgo;
          }
          return false;
        default:
          return true;
      }
    });
  }, [results, activeFilter]);

  const toggleSelection = (id) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

  const handleClear = () => {
    setSearchTerm('');
    clear();
    setSelectedItems(new Set());
  };

  const selectAll = () => {
    setSelectedItems(new Set(filteredResults.map((r) => r.id)));
  };

  const clearSelection = () => {
    setSelectedItems(new Set());
  };

  return (
    <main className="flex-1 overflow-y-auto bg-background-light dark:bg-background-dark/50">
      <SearchResultsHeader
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onSearch={handleSearch}
        onClear={handleClear}
        resultsCount={filteredResults.length}
        loading={loading}
      />

      {/* AI Interpretation */}
      {aiInterpretation && (
        <div className="px-8 px-4 py-2">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400 px-4 py-2 rounded-lg text-sm">
            <span className="font-medium">AI: </span>
            {aiInterpretation}
          </div>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="px-8 px-4 py-2">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
            Search failed: {error}
            <button
              onClick={() => search(searchTerm)}
              className="ml-2 underline hover:no-underline"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      <div className="">
        {/* Filter Bar with Selection Actions */}
        <div className="sticky top-0 bg-background-light dark:bg-background-dark/50 z-10 pb-4">
          <SearchFilter activeFilter={activeFilter} onFilterChange={setActiveFilter} />
          {selectedItems.size > 0 && (
            <div className="flex items-center justify-between mt-3 px-4">
              <span className="text-sm text-slate-600 dark:text-slate-400">
                {selectedItems.size} file{selectedItems.size !== 1 ? 's' : ''} selected
              </span>
              <div className="flex gap-2">
                <button
                  onClick={selectAll}
                  className="text-sm text-primary hover:underline font-medium"
                >
                  Select All
                </button>
                <button
                  onClick={clearSelection}
                  className="text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                >
                  Clear
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent mb-4"></div>
            <p className="text-slate-500 dark:text-slate-400">Searching across all devices...</p>
          </div>
        )}

        {/* Results List */}
        {!loading && (
          <div className="px-8 pb-8 space-y-3">
            {filteredResults.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-lg text-slate-500 dark:text-slate-400">
                  {lastQuery
                    ? `No results found for "${lastQuery}"`
                    : 'Enter a search query to find files'}
                </p>
                {lastQuery && (
                  <p className="text-sm text-slate-400 dark:text-slate-500 mt-2">
                    Try different keywords or check your connected devices
                  </p>
                )}
              </div>
            ) : (
              filteredResults.map((result) => (
                <SearchResultItem
                  key={result.id}
                  result={result}
                  selected={selectedItems.has(result.id)}
                  onSelect={toggleSelection}
                />
              ))
            )}
          </div>
        )}
      </div>
    </main>
  );
}
