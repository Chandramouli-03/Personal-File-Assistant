import { useState } from 'react';
import { MdSearch, MdFolder, MdComputer, MdCloudSync } from 'react-icons/md';
import { formatSize } from '../utils/format';

export default function HeroSection({ onSearch, stats, loading }) {
  const [query, setQuery] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch?.(query.trim());
    }
  };

  return (
    <section className="w-full max-w-4xl px-6 pt-16 pb-12 flex flex-col items-center">
      <div className="text-center mb-10">
        <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 dark:text-white mb-4 tracking-tight">
          Search across all your devices
        </h1>
        <p className="text-lg text-slate-500 dark:text-slate-400 font-medium">
          Find any file, anywhere, using natural language.
        </p>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSubmit} className="w-full max-w-2xl mb-8">
        <div className="relative flex items-center bg-white dark:bg-slate-800 rounded-2xl shadow-lg border-2 border-transparent focus-within:border-primary transition-all p-2">
          <div className="pl-4 text-primary">
            <MdSearch className="text-2xl" />
          </div>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent border-none focus:ring-0 text-lg md:text-xl py-4 px-4 text-slate-800 dark:text-white placeholder:text-slate-400 outline-none"
            placeholder="Find my resume pdf or Photos from last month..."
            type="text"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="px-6 py-3 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
            ) : (
              'Search'
            )}
          </button>
        </div>
      </form>

      {/* Stats Row */}
      {stats && !loading && (
        <div className="flex items-center gap-8 text-sm text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <MdFolder className="text-primary" />
            <span>{stats.file_count?.toLocaleString() || 0} files indexed</span>
          </div>
          <div className="flex items-center gap-2">
            <MdComputer className="text-primary" />
            <span>{formatSize(stats.total_size || 0)} total</span>
          </div>
          {stats.is_scanning && (
            <div className="flex items-center gap-2 text-blue-500">
              <MdCloudSync className="animate-spin" />
              <span>Scanning...</span>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
