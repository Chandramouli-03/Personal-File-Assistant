import { useState } from 'react';
import SearchResultsHeader from '../components/search-results/SearchResultsHeader';
import SearchFilter from '../components/search-results/SearchFilter';
import SearchResultItem from '../components/search-results/SearchResultItem';

const MOCK_SEARCH_RESULTS = [
  {
    id: 1,
    name: 'quarterly_report_2024.pdf',
    type: 'pdf',
    device: 'Work-Station-Pro',
    location: 'Documents / Reports',
    size: '2.4 MB',
    preview: null,
  },
  {
    id: 2,
    name: 'vacation_photo_2024_01.jpg',
    type: 'image',
    device: 'iPhone 15 Pro',
    location: 'Photos / Summer Trip',
    size: '4.2 MB',
    preview: 'https://images.unsplash.com/photo-1506905925346-767f6b6dce7',
  },
  {
    id: 3,
    name: 'project_brief.docx',
    type: 'document',
    device: 'MacBook Air M2',
    location: 'Documents / Work',
    size: '156 KB',
    preview: null,
  },
  {
    id: 4,
    name: 'meeting_recording.mp4',
    type: 'video',
    device: 'Ubuntu-Server-X',
    location: 'Videos / Meetings',
    size: '45.8 MB',
    preview: null,
  },
  {
    id: 5,
    name: 'design_mockup.png',
    type: 'image',
    device: 'Pixel 8 Pro',
    location: 'Downloads / Design',
    size: '3.1 MB',
    preview: 'https://images.unsplash.com/photo-1561070791-2526d252640d',
  },
  {
    id: 6,
    name: 'contract_final_signed.pdf',
    type: 'pdf',
    device: 'Work-Station-Pro',
    location: 'Documents / Contracts',
    size: '890 KB',
    preview: null,
  },
  {
    id: 7,
    name: 'screenshot_2024.png',
    type: 'image',
    device: 'iPhone 15 Pro',
    location: 'Screenshots',
    size: '2.1 MB',
    preview: 'https://images.unsplash.com/photo-1550000000-0000000000000',
  },
];

export default function SearchResults({ initialQuery = '' }) {
  const [searchTerm, setSearchTerm] = useState(initialQuery);
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedItems, setSelectedItems] = useState(new Set());

  const filteredResults = MOCK_SEARCH_RESULTS.filter((result) => {
    const matchesSearch = result.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         result.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         result.device.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = activeFilter === 'all' ||
                         (activeFilter === 'images' && result.type === 'image') ||
                         (activeFilter === 'documents' && ['pdf', 'document'].includes(result.type)) ||
                         (activeFilter === 'videos' && result.type === 'video') ||
                         (activeFilter === 'recent' && result.id <= 3);
    return matchesSearch && matchesFilter;
  });

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
  };

  const selectAll = () => {
    setSelectedItems(new Set(filteredResults.map(r => r.id)));
  };

  const clearSelection = () => {
    setSelectedItems(new Set());
  };

  return (
    <main className="flex-1 overflow-y-auto bg-background-light dark:bg-background-dark/50">
      <SearchResultsHeader
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onClear={handleClear}
        resultsCount={filteredResults.length}
      />

      <div className="max-w-6xl mx-auto">
        {/* Filter Bar with Selection Actions */}
        <div className="sticky top-0 bg-background-light dark:bg-background-dark/50 z-10 py-4">
          <SearchFilter activeFilter={activeFilter} onFilterChange={setActiveFilter} />
          {selectedItems.size > 0 && (
            <div className="flex items-center justify-between mt-3 px-4">
              <span className="text-sm text-slate-600 dark:text-slate-400">
                {selectedItems.size} file{selectedItems.size !== 1 ? 's' : ''} selected
              </span>
              <div className="flex gap-2">
                <button
                  onClick={select}
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

        {/* Results List */}
        <div className="pb-8 space-y-3">
          {filteredResults.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-lg text-slate-500 dark:text-slate-400">No results found for "{searchTerm}"</p>
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
      </div>
    </main>
  );
}
