import { MdFilterList } from 'react-icons/md';

export default function SearchFilter({ activeFilter, onFilterChange }) {
  const filters = [
    { id: 'all', label: 'All Files' },
    { id: 'recent', label: 'Recent' },
    { id: 'images', label: 'Images' },
    { id: 'documents', label: 'Documents' },
    { id: 'videos', label: 'Videos' },
  ];

  return (
    <div className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-6 py-3">
      <div className="px-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MdFilterList className="text-slate-500" />
          <div className="flex flex-wrap gap-2">
            {filters.map((filter) => (
              <button
                key={filter.id}
                onClick={() => onFilterChange(filter.id)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  activeFilter === filter.id
                  ? 'bg-primary text-white'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {/* Search Mode Toggle */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 dark:text-slate-400">Search Mode:</span>
          <div className="flex bg-white dark:bg-slate-800 rounded-lg p-1">
            <button
              onClick={() => onFilterChange('filename')}
              className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                activeFilter === 'filename' || !['all', 'recent', 'images', 'documents', 'videos'].includes(activeFilter)
                  ? 'bg-primary text-white'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Filename
            </button>
            <button
              onClick={() => onFilterChange('semantic')}
              className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                activeFilter === 'semantic'
                  ? 'bg-primary text-white'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Semantic
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
