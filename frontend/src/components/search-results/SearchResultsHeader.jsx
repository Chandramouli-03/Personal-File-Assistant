import { MdSearch, MdClose } from 'react-icons/md';

export default function SearchResultsHeader({ searchTerm, onSearchChange, onClear, resultsCount }) {
  return (
    <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-6">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-4 items-center">
        <div className="flex-1 relative">
          <MdSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xl" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search files..."
            className="w-full pl-12 pr-12 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-slate-900 dark:text-white"
          />
          {searchTerm && (
            <button
              onClick={onClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            >
              <MdClose />
            </button>
          )}
        </div>
        <div className="text-slate-500 dark:text-slate-400 text-sm">
          {resultsCount} results found
        </div>
      </div>
    </div>
  );
}
