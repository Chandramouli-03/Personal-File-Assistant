import { MdSearch } from 'react-icons/md';

export default function DeviceFilters({ searchTerm, setSearchTerm, activeFilter, setActiveFilter }) {
  return (
    <div className="flex flex-col sm:flex-row gap-4">
      <div className="relative flex-1 group">
        <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all shadow-sm"
          placeholder="Search by device name, OS, or status..."
        />
      </div>
      <div className="flex p-1 bg-slate-200 dark:bg-slate-800 rounded-xl">
        <button
          onClick={() => setActiveFilter('all')}
          className={`px-6 py-2 text-sm font-bold rounded-lg ${activeFilter === 'all' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors'}`}
        >
          All
        </button>
        <button
          onClick={() => setActiveFilter('mobile')}
          className={`px-6 py-2 text-sm font-bold rounded-lg ${activeFilter === 'mobile' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors'}`}
        >
          Mobile
        </button>
        <button
          onClick={() => setActiveFilter('desktop')}
          className={`px-6 py-2 text-sm font-bold rounded-lg ${activeFilter === 'desktop' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors'}`}
        >
          Desktop
        </button>
      </div>
    </div>
  );
}
